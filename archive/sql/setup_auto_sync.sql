
-- Function to handle Product size_id changes (updates print_size in orders)
CREATE OR REPLACE FUNCTION public.handle_product_size_change()
RETURNS TRIGGER AS $$
DECLARE
    new_size_name text;
BEGIN
    -- Check if size_id has changed
    IF NEW.size_id IS DISTINCT FROM OLD.size_id THEN
        -- specific check for null to avoid errors, though distinct covers it
        IF NEW.size_id IS NOT NULL THEN
             SELECT name INTO new_size_name FROM public.sizes WHERE id = NEW.size_id;
             
             IF new_size_name IS NOT NULL THEN
                 UPDATE public.orders
                 SET print_size = new_size_name
                 WHERE product_id = NEW.id
                 AND status NOT IN ('Complete', 'Delivered', 'Cancelled'); -- Only update active orders
             END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Products
DROP TRIGGER IF EXISTS on_product_size_change ON public.products;
CREATE TRIGGER on_product_size_change
AFTER UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.handle_product_size_change();

-- Function to handle Size name changes (updates both print_size and paper_order_size)
CREATE OR REPLACE FUNCTION public.handle_size_name_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
        -- 1. Update print_size for orders where product uses this size
        UPDATE public.orders o
        SET print_size = NEW.name
        FROM public.products p
        WHERE o.product_id = p.id
        AND p.size_id = NEW.id
        AND o.status NOT IN ('Complete', 'Delivered', 'Cancelled');

        -- 2. Update paper_order_size for orders that use this size DIRECTLY
        UPDATE public.orders
        SET paper_order_size = NEW.name
        WHERE paper_order_size_id = NEW.id
        AND status NOT IN ('Complete', 'Delivered', 'Cancelled');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Sizes
DROP TRIGGER IF EXISTS on_size_name_edit ON public.sizes;
CREATE TRIGGER on_size_name_edit
AFTER UPDATE ON public.sizes
FOR EACH ROW
EXECUTE FUNCTION public.handle_size_name_change();
