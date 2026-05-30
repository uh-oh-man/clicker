export function EmbeddedClickerModal({ clicker, open, fullscreen, iframeRef, onClose, onEnterFullscreen, onExitFullscreen, onLoad }) {
  return (
    <div className={`modal-backdrop embedded-backdrop ${open ? "is-open" : "is-hidden"} ${fullscreen ? "is-fullscreen" : ""}`} role="presentation" aria-hidden={!open}>
      <section className="clicker-modal embedded-modal" role="dialog" aria-modal="true" aria-label={`${clicker.name} embedded clicker`} style={{ "--accent": clicker.accent, "--glow": clicker.glow }}>
        <header className="modal-head">
          <div>
            <p className="eyebrow">Embedded Clicker</p>
            <h2>{clicker.name}</h2>
          </div>
          <div className="modal-actions">
            <button className="ghost-button" type="button" onClick={onEnterFullscreen}>Fullscreen</button>
            <button className="modal-close" type="button" onClick={onClose}>Close</button>
          </div>
        </header>

        <p className="iframe-notice">
          Cookie Clicker is running from this site's local static copy. It stays separate from fruit saves, events, ascension, and multiplayer.
        </p>

        <div className="iframe-frame">
          <iframe
            ref={iframeRef}
            title={clicker.name}
            src={clicker.externalUrl}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
            onLoad={onLoad}
          />
        </div>
      </section>
      {fullscreen && (
        <button className="cookie-fullscreen-exit" type="button" onClick={onExitFullscreen}>
          Exit fullscreen
        </button>
      )}
    </div>
  );
}
