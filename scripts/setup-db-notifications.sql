-- Enable NOTIFY triggers for real-time server updates

-- Function to notify when Server table changes
CREATE OR REPLACE FUNCTION notify_server_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('server_change', JSON_BUILD_OBJECT(
    'id', NEW.id,
    'action', TG_OP
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify when ReverseProxyServer table changes
CREATE OR REPLACE FUNCTION notify_reverse_proxy_server_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('reverse_proxy_server_change', JSON_BUILD_OBJECT(
    'id', NEW.id,
    'action', TG_OP
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS server_change_trigger ON "Server";
DROP TRIGGER IF EXISTS reverse_proxy_server_change_trigger ON "ReverseProxyServer";

-- Create triggers for Server table (INSERT, UPDATE, DELETE)
CREATE TRIGGER server_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON "Server"
FOR EACH ROW
EXECUTE FUNCTION notify_server_change();

-- Create triggers for ReverseProxyServer table (INSERT, UPDATE, DELETE)
CREATE TRIGGER reverse_proxy_server_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON "ReverseProxyServer"
FOR EACH ROW
EXECUTE FUNCTION notify_reverse_proxy_server_change();

-- Function to notify when CustomEnvironmentVariable table changes (for servers and reverse proxies)
CREATE OR REPLACE FUNCTION notify_env_var_change()
RETURNS TRIGGER AS $$
DECLARE
  server_id TEXT;
  proxy_id TEXT;
BEGIN
  server_id := NEW.server_id;
  proxy_id := NEW.reverse_proxy_id;

  IF server_id IS NOT NULL THEN
    PERFORM pg_notify('server_change', JSON_BUILD_OBJECT(
      'id', server_id,
      'action', 'env_var_change'
    )::text);
  ELSIF proxy_id IS NOT NULL THEN
    PERFORM pg_notify('reverse_proxy_server_change', JSON_BUILD_OBJECT(
      'id', proxy_id,
      'action', 'env_var_change'
    )::text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing env var trigger if it exists
DROP TRIGGER IF EXISTS env_var_change_trigger ON "CustomEnvironmentVariable";

-- Create trigger for CustomEnvironmentVariable table
CREATE TRIGGER env_var_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON "CustomEnvironmentVariable"
FOR EACH ROW
EXECUTE FUNCTION notify_env_var_change();
