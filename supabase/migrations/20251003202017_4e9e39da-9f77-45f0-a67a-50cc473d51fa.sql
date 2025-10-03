-- Add accounting and operational fields to products table
ALTER TABLE public.products
ADD COLUMN sku TEXT,
ADD COLUMN cost_price NUMERIC DEFAULT 0,
ADD COLUMN tax_code TEXT,
ADD COLUMN tax_rate NUMERIC DEFAULT 0,
ADD COLUMN supplier TEXT,
ADD COLUMN purchase_date DATE,
ADD COLUMN invoice_number TEXT,
ADD COLUMN minimum_stock INTEGER DEFAULT 0,
ADD COLUMN storage_location TEXT,
ADD COLUMN expiration_date DATE;

-- Add accounting fields to transactions table
ALTER TABLE public.transactions
ADD COLUMN unit_cost NUMERIC DEFAULT 0,
ADD COLUMN document_number TEXT,
ADD COLUMN reference TEXT,
ADD COLUMN responsible TEXT,
ADD COLUMN transaction_date DATE DEFAULT CURRENT_DATE;

-- Add professional fields to quotes table
ALTER TABLE public.quotes
ADD COLUMN quote_number TEXT,
ADD COLUMN payment_terms TEXT,
ADD COLUMN delivery_details TEXT;

-- Add discount and tax fields to quote_items table
ALTER TABLE public.quote_items
ADD COLUMN discount NUMERIC DEFAULT 0,
ADD COLUMN tax_percentage NUMERIC DEFAULT 0;

-- Create a function to auto-generate quote numbers
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  current_year TEXT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '\d+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM quotes
  WHERE quote_number LIKE 'QT-' || current_year || '-%';
  
  RETURN 'QT-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to auto-generate quote numbers
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    NEW.quote_number := generate_quote_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_quote_number
BEFORE INSERT ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION set_quote_number();