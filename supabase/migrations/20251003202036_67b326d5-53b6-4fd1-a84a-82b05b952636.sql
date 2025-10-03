-- Fix security warnings by setting search_path on functions

-- Recreate generate_quote_number function with search_path
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Recreate set_quote_number trigger function with search_path
CREATE OR REPLACE FUNCTION public.set_quote_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    NEW.quote_number := generate_quote_number();
  END IF;
  RETURN NEW;
END;
$$;