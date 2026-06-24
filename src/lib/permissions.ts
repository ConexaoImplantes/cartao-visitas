export type PermissionKey =
  | "dashboard.view"
  | "dashboard.create"
  | "dashboard.edit"
  | "dashboard.delete"
  | "dashboard.toggle_status"
  | "dashboard.download_qr"
  | "dashboard.view_qr"
  | "dashboard.view_link"
  | "tema.view"
  | "tema.edit";

export interface PermissionDef {
  key: PermissionKey;
  label: string;
}

export interface PermissionGroup {
  route: string;
  label: string;
  description: string;
  permissions: PermissionDef[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    route: "dashboard",
    label: "Dashboard de Colaboradores",
    description: "Gestão dos cartões digitais e QR Codes.",
    permissions: [
      { key: "dashboard.view", label: "Visualizar lista" },
      { key: "dashboard.create", label: "Criar colaborador" },
      { key: "dashboard.edit", label: "Editar colaborador" },
      { key: "dashboard.delete", label: "Excluir colaborador" },
      { key: "dashboard.toggle_status", label: "Ativar / inativar" },
      { key: "dashboard.view_link", label: "Abrir Link Tree" },
      { key: "dashboard.view_qr", label: "Visualizar QR Code" },
      { key: "dashboard.download_qr", label: "Baixar QR Code" },
    ],
  },
  {
    route: "tema",
    label: "Tema (personalização)",
    description: "Configurações visuais e dados institucionais.",
    permissions: [
      { key: "tema.view", label: "Visualizar tema" },
      { key: "tema.edit", label: "Editar e salvar tema" },
    ],
  },
];

export const ALL_PERMISSIONS: PermissionKey[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key),
);

export function isValidPermission(value: string): value is PermissionKey {
  return (ALL_PERMISSIONS as string[]).includes(value);
}
