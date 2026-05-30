const permissionLabels = {
  canViewSharedClickers: "View shared clickers",
  canClickSharedFruit: "Click shared fruit",
  canBuyUpgrades: "Buy upgrades",
  canAscendFruit: "Ascend fruit",
  canInteractWithFruitEvents: "Interact with events",
  canUseLiveChat: "Use live chat",
  canSaveLocalCopy: "Save local copy",
};

export function PermissionEditor({ permissions, onChange }) {
  return (
    <div className="permission-grid">
      {Object.entries(permissionLabels).map(([key, label]) => (
        <label key={key}>
          <input
            type="checkbox"
            checked={Boolean(permissions?.[key])}
            onChange={(event) => onChange({ ...permissions, [key]: event.target.checked })}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}
