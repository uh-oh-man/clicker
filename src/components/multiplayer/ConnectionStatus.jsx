export function ConnectionStatus({ status, detail }) {
  return (
    <div className="connection-status">
      <span className={`status-light status-light--${String(status).toLowerCase().replace(/\s+/g, "-")}`} />
      <div>
        <strong>{status}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
}
