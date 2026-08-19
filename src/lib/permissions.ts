export type PermissionKey =
  | "dashboard.view"
  | "dashboard.create"
  | "dashboard.edit"
  | "dashboard.delete"
  | "dashboard.toggle_status"
  | "dashboard.download_qr"
  | "dashboard.download_card"
  | "dashboard.view_qr"
  | "dashboard.view_link"
  | "dashboard.share"
  | "cartao_fisico.view"
  | "cartao_fisico.download"
  | "foto_perfil.view"
  | "foto_perfil.edit"
  | "foto_perfil.download"
  | "assinatura.view"
  | "assinatura.download"
  | "importar.view"
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
      { key: "dashboard.download_card", label: "Baixar cartão para impressão" },
      { key: "dashboard.share", label: "Compartilhar com o colaborador" },
    ],
  },
  {
    route: "cartao-fisico",
    label: "Cartão de Visitas (impressão)",
    description: "Geração e download do cartão físico em PDF.",
    permissions: [
      { key: "cartao_fisico.view", label: "Acessar a rota" },
      { key: "cartao_fisico.download", label: "Baixar PDF do cartão" },
    ],
  },
  {
    route: "foto-perfil",
    label: "Foto de Perfil (1080x1080)",
    description: "Criação da arte institucional de foto de perfil dos colaboradores.",
    permissions: [
      { key: "foto_perfil.view", label: "Acessar a rota" },
      { key: "foto_perfil.edit", label: "Enviar foto e ajustar enquadramento" },
      { key: "foto_perfil.download", label: "Baixar / compartilhar a arte" },
    ],
  },
  {
    route: "assinatura",
    label: "Assinatura de E-mail",
    description: "Geração e download das assinaturas em PNG.",
    permissions: [
      { key: "assinatura.view", label: "Acessar a rota" },
      { key: "assinatura.download", label: "Baixar assinatura" },
    ],
  },
  {
    route: "importar",
    label: "Importação em massa (CSV)",
    description: "Criação de Link Trees a partir de planilha.",
    permissions: [{ key: "importar.view", label: "Acessar a rota" }],
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
