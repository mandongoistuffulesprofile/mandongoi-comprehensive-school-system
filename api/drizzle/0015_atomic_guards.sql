--> statement-breakpoint
-- Deferred trigger to enforce ledger balance on every journal entry
CREATE OR REPLACE FUNCTION check_ledger_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0)
    FROM ledger_lines
    WHERE ledger_entry_id = NEW.ledger_entry_id
  ) != 0 THEN
    RAISE EXCEPTION 'Ledger entry % is not balanced', NEW.ledger_entry_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_check_ledger_balance ON ledger_lines;
CREATE CONSTRAINT TRIGGER trg_check_ledger_balance
AFTER INSERT OR UPDATE ON ledger_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_ledger_balance();

--> statement-breakpoint
-- Payroll run state transition guard
CREATE OR REPLACE FUNCTION check_payroll_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'paid' THEN
    RAISE EXCEPTION 'Cannot transition payroll run from paid state';
  END IF;
  IF OLD.status = 'approved' AND NEW.status != 'paid' THEN
    RAISE EXCEPTION 'Approved payroll can only transition to paid';
  END IF;
  IF OLD.status = 'draft' AND NEW.status NOT IN ('approved', 'draft') THEN
    RAISE EXCEPTION 'Draft payroll can only transition to approved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_payroll_state_transition ON payroll_runs;
CREATE TRIGGER trg_payroll_state_transition
BEFORE UPDATE OF status ON payroll_runs
FOR EACH ROW EXECUTE FUNCTION check_payroll_state_transition();

--> statement-breakpoint
-- Invoice status sync: keep status consistent with balance
CREATE OR REPLACE FUNCTION sync_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status := CASE
    WHEN NEW.balance <= 0 THEN 'paid'
    WHEN NEW.amount_paid > 0 THEN 'partial'
    ELSE 'unpaid'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_sync_invoice_status ON fee_invoices;
CREATE TRIGGER trg_sync_invoice_status
BEFORE UPDATE OF amount_paid, balance ON fee_invoices
FOR EACH ROW EXECUTE FUNCTION sync_invoice_status();
