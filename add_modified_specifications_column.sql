-- Add Modified Specifications Column to Quotations Table
-- This allows merchants to modify user specifications and store them in JSON format

-- Add the modified_specifications column to store merchant-modified specifications
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS modified_specifications JSONB;

-- Add index for better performance when querying modified specifications
CREATE INDEX IF NOT EXISTS idx_quotations_modified_specifications 
ON quotations USING GIN (modified_specifications);

-- Add comment to explain the column purpose
COMMENT ON COLUMN quotations.modified_specifications IS 'Stores merchant-modified specifications in JSON format. Structure: {"item_index": {"field_name": "modified_value"}}';

-- Example of the JSON structure:
-- {
--   "0": {
--     "variety": "Modified Variety Name",
--     "age_category": "2 years",
--     "height_range": "3-4 ft",
--     "stem_thickness": "3",
--     "bag_size": "8\"",
--     "is_grafted": true,
--     "delivery_timeline": "Within 10 days",
--     "notes": "Additional merchant notes"
--   },
--   "1": {
--     "variety": "Another Modified Variety",
--     "age_category": "1 year",
--     "height_range": "2-3 ft"
--   }
-- }