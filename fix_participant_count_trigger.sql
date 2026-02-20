-- Create a function to maintain the current_participants count on contests
CREATE OR REPLACE FUNCTION maintain_contest_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE contests
    SET current_participants = current_participants + 1
    WHERE id = NEW.contest_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE contests
    SET current_participants = current_participants - 1
    WHERE id = OLD.contest_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_maintain_contest_participants ON contest_participants;

-- Create the trigger
CREATE TRIGGER trigger_maintain_contest_participants
AFTER INSERT OR DELETE ON contest_participants
FOR EACH ROW
EXECUTE FUNCTION maintain_contest_participants();
