// Order Validation Utilities for Parent-Child Order System
import { supabase } from './supabase';

export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that a parent order's total_amount equals the sum of its child orders' subtotals
 */
export async function validateParentOrderTotals(parentOrderId: string): Promise<OrderValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Get parent order
    const { data: parentOrder, error: parentError } = await supabase
      .from('orders')
      .select('id, total_amount, subtotal')
      .eq('id', parentOrderId)
      .is('parent_order_id', null)
      .single();

    if (parentError) {
      errors.push(`Failed to fetch parent order: ${parentError.message}`);
      return { isValid: false, errors, warnings };
    }

    // Get child orders
    const { data: childOrders, error: childError } = await supabase
      .from('orders')
      .select('id, subtotal')
      .eq('parent_order_id', parentOrderId);

    if (childError) {
      errors.push(`Failed to fetch child orders: ${childError.message}`);
      return { isValid: false, errors, warnings };
    }

    // Calculate sum of child subtotals
    const childSubtotalSum = childOrders.reduce((sum, child) => sum + (child.subtotal || 0), 0);
    const parentTotal = parentOrder.total_amount || 0;

    // Validate total_amount = sum of child subtotals
    if (Math.abs(parentTotal - childSubtotalSum) > 0.01) { // Allow for small floating point differences
      errors.push(`Parent order total (${parentTotal}) does not match sum of child subtotals (${childSubtotalSum})`);
    }

    // Validate parent subtotal = parent total_amount
    if (Math.abs((parentOrder.subtotal || 0) - parentTotal) > 0.01) {
      errors.push(`Parent order subtotal (${parentOrder.subtotal}) does not match total_amount (${parentTotal})`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors, warnings };
  }
}

/**
 * Validates that order_items subtotals are correctly calculated
 */
export async function validateOrderItemsSubtotals(orderId: string): Promise<OrderValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('id, quantity, price, unit_price, subtotal')
      .eq('order_id', orderId);

    if (itemsError) {
      errors.push(`Failed to fetch order items: ${itemsError.message}`);
      return { isValid: false, errors, warnings };
    }

    // Validate each order item's subtotal
    for (const item of orderItems) {
      const expectedSubtotal = (item.quantity || 0) * (item.unit_price || item.price || 0);
      const actualSubtotal = item.subtotal || 0;

      if (Math.abs(expectedSubtotal - actualSubtotal) > 0.01) {
        errors.push(`Order item ${item.id}: expected subtotal ${expectedSubtotal}, got ${actualSubtotal}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors, warnings };
  }
}

/**
 * Validates the entire parent-child order structure
 */
export async function validateOrderStructure(parentOrderId: string): Promise<OrderValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validate parent order totals
    const parentValidation = await validateParentOrderTotals(parentOrderId);
    errors.push(...parentValidation.errors);
    warnings.push(...parentValidation.warnings);

    // Get child orders to validate their order items
    const { data: childOrders, error: childError } = await supabase
      .from('orders')
      .select('id')
      .eq('parent_order_id', parentOrderId);

    if (childError) {
      errors.push(`Failed to fetch child orders: ${childError.message}`);
      return { isValid: false, errors, warnings };
    }

    // Validate order items for each child order
    for (const childOrder of childOrders) {
      const itemsValidation = await validateOrderItemsSubtotals(childOrder.id);
      errors.push(...itemsValidation.errors);
      warnings.push(...itemsValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors, warnings };
  }
}

/**
 * Fixes order subtotals if they are incorrect
 */
export async function fixOrderSubtotals(orderId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Fix order_items subtotals
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('id, quantity, price, unit_price, subtotal')
      .eq('order_id', orderId);

    if (itemsError) {
      return { success: false, message: `Failed to fetch order items: ${itemsError.message}` };
    }

    // Update each order item's subtotal
    for (const item of orderItems) {
      const correctSubtotal = (item.quantity || 0) * (item.unit_price || item.price || 0);
      
      const { error: updateError } = await supabase
        .from('order_items')
        .update({ subtotal: correctSubtotal })
        .eq('id', item.id);

      if (updateError) {
        return { success: false, message: `Failed to update order item ${item.id}: ${updateError.message}` };
      }
    }

    // Update order subtotal
    const orderSubtotal = orderItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({ subtotal: orderSubtotal })
      .eq('id', orderId);

    if (orderUpdateError) {
      return { success: false, message: `Failed to update order subtotal: ${orderUpdateError.message}` };
    }

    return { success: true, message: 'Order subtotals fixed successfully' };

  } catch (error) {
    return { success: false, message: `Error fixing subtotals: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}