-- 020_inventory_management.sql

-- Enable uuid-ossp if not already enabled (usually is, but good practice)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Inventory Items Table
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Scanner', 'Communication', 'Vehicle', 'Uniform', 'Other'
    serial_number TEXT,
    status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'In Repair', 'Lost', 'Decommissioned'
    
    -- Holder Information
    current_holder_name TEXT,
    current_holder_contact TEXT,
    current_holder_address TEXT,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL, -- Optional location link
    
    -- Tracking Dates
    date_of_issue DATE,
    next_maintenance_date DATE,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Audit Logs Table
CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'CREATED', 'UPDATED_HOLDER', 'STATUS_CHANGED', 'MAINTENANCE_LOGGED'
    previous_holder_name TEXT,
    new_holder_name TEXT,
    previous_status TEXT,
    new_status TEXT,
    notes TEXT,
    logged_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who made the change
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION set_inventory_item_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_items_updated_at
BEFORE UPDATE ON inventory_items
FOR EACH ROW
EXECUTE FUNCTION set_inventory_item_updated_at();

-- RLS Policies
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read inventory items and logs
CREATE POLICY "Authenticated users can read inventory items"
ON inventory_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read inventory logs"
ON inventory_logs FOR SELECT
TO authenticated
USING (true);

-- Assuming managers and admins can manage inventory. For simplicity, allow authenticated.
CREATE POLICY "Authenticated users can insert inventory items"
ON inventory_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory items"
ON inventory_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete inventory items"
ON inventory_items FOR DELETE
TO authenticated
USING (true);

-- Allow authenticated users to insert logs
CREATE POLICY "Authenticated users can insert inventory logs"
ON inventory_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create a helper function to automatically log changes (Optional, but let's do it in API layer instead for more control over 'logged_by')
