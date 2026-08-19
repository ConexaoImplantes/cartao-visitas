import fontRegularAsset from "@/assets/OpenSans-Regular.ttf.asset.json";
import fontBoldAsset from "@/assets/OpenSans-Bold.ttf.asset.json";
import fontItalicAsset from "@/assets/OpenSans-Italic.ttf.asset.json";
import { buildCardUrl } from "./qr";

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 56;

const GOLD = { r: 0xc5 / 255, g: 0x99 / 255, b: 0x37 / 255 };
const NAVY = { r: 0x00 / 255, g: 0x4a / 255, b: 0x8f / 255 };
const TEXT = { r: 0.15, g: 0.16, b: 0.18 };
const MUTED = { r: 0.42, g: 0.44, b: 0.47 };

export interface GuideInput {
  nome: string;
  cargo: string;
  email: string;
  slug: string;
  /** Modelo escolhido do cartão de visitas. */
  modelo?: "novo" | "antigo";
  /** Página pública onde o colaborador rebaixa os materiais. */
  kitUrl?: string;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  if (url.startsWith("data:")) {
    const bin = atob(url.slice(url.indexOf(",") + 1));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar recurso: ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function qrBytes(slug: string): Promise<Uint8Array> {
  const QRCode = (await import("qrcode")).default;
  const dataUrl = await QRCode.toDataURL(buildCardUrl(slug), {
    width: 900,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#ffffff" },
  });
  return fetchBytes(dataUrl);
}

interface Section {
  title: string;
  intro?: string;
  steps: string[];
}

function sections(c: GuideInput, url: string): Section[] {
  const modelo = c.modelo === "antigo" ? "Antigo" : "Novo";
  return [
    {
      title: "1. Link Tree corporativo",
      intro: `Seu endereço exclusivo: ${url}`,
      steps: [
        "Use o link na bio do Instagram, do LinkedIn e do Facebook.",
        "Cole o link na sua assinatura de e-mail e nas mensagens de WhatsApp.",
        "O QR Code desta página leva direto ao seu Link Tree — pode ser impresso, projetado em eventos ou enviado por imagem.",
        "Todos os contatos (WhatsApp, telefone, e-mail e redes) ficam atualizados automaticamente: nunca é preciso trocar o link.",
      ],
    },
    {
      title: "2. Foto de perfil (arquivo PNG 1080x1080)",
      intro: "Arte institucional padronizada para os seus perfis profissionais.",
      steps: [
        "WhatsApp Business: Configurações > Perfil da empresa > toque na foto > Galeria > selecione a arte e mantenha o enquadramento sem cortes.",
        "LinkedIn: clique na sua foto > Alterar foto > enviar o PNG > ajuste o zoom para 100% e salve.",
        "Microsoft Teams / Google Workspace: perfil > alterar imagem > enviar o mesmo arquivo.",
        "Não aplique filtros, molduras ou recortes adicionais: a arte já segue o padrão da marca.",
      ],
    },
    {
      title: "3. Assinatura de e-mail (PNG 1772x591 px — 150x50 mm a 300 dpi)",
      intro: "Imagem única com nome, cargo, contatos e QR Code do seu Link Tree.",
      steps: [
        "Gmail: Configurações > Ver todas as configurações > Geral > Assinatura > Criar > ícone de imagem > Fazer upload do PNG.",
        "Gmail: com a imagem selecionada, escolha o tamanho 'Pequeno' ou 'Médio' e depois use o ícone de link para apontar a imagem ao seu Link Tree.",
        "Outlook (web): Configurações > E-mail > Redigir e responder > insira a imagem na assinatura e adicione o link.",
        "Outlook (desktop): Arquivo > Opções > E-mail > Assinaturas > Nova > inserir imagem > inserir hiperlink com o seu Link Tree.",
        "Envie um e-mail de teste para você mesmo e confira se a imagem aparece e se o link funciona.",
      ],
    },
    {
      title: `4. Cartão de visitas impresso (modelo ${modelo})`,
      intro: "PDF pronto para gráfica, com sangria e marcas de corte.",
      steps: [
        "Formato final 90x48 mm, com 3 mm de sangria em cada lado e marcas de corte nas quatro extremidades.",
        "As artes de fundo estão em 300 dpi. Não redimensione nem recomprima o PDF.",
        "O arquivo tem 2 páginas: página 1 = frente, página 2 = verso.",
        "O PDF é entregue em RGB. Peça à gráfica a conversão para CMYK / perfil de impressão no pré-impressão.",
        "Sugestão de acabamento: papel couché 300 g com laminação fosca.",
      ],
    },
    {
      title: "5. Regras e bom uso dos materiais",
      intro: "As artes são material oficial da marca Conexão Implantes.",
      steps: [
        "Use sempre a arte oficial, exatamente como recebida: sem filtros, molduras, sombras, recortes ou alteração de cores.",
        "Não edite textos, não troque fontes e não reposicione elementos das artes.",
        "Não combine os materiais com outras marcas, logotipos, promoções ou conteúdos de terceiros.",
        "Não use as artes em perfis pessoais, em conteúdos político-partidários ou em qualquer contexto que não seja profissional.",
        "Não altere o QR Code nem o link: eles são exclusivos e usados para medir o desempenho do seu cartão digital.",
        "Ao mudar de cargo, telefone ou e-mail, solicite ao seu gestor a atualização dos materiais — não edite por conta própria.",
        `Precisa dos arquivos de novo? Acesse a qualquer momento: ${c.kitUrl ?? url}`,
      ],
    },
  ];
}

/** Gera o PDF explicativo personalizado do colaborador. */
export async function buildGuidePdf(c: GuideInput): Promise<Uint8Array> {
  const [{ PDFDocument, rgb }, fontkitMod] = await Promise.all([
    import("pdf-lib"),
    import("@pdf-lib/fontkit"),
  ]);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit((fontkitMod as any).default ?? fontkitMod);
  pdf.setTitle(`Como usar seus materiais — ${c.nome}`);
  pdf.setCreator("Link Tree Corporativo — Conexão Implantes");

  const [regularBytes, boldBytes, italicBytes] = await Promise.all([
    fetchBytes(fontRegularAsset.url as string),
    fetchBytes(fontBoldAsset.url as string),
    fetchBytes(fontItalicAsset.url as string),
  ]);
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  const italic = await pdf.embedFont(italicBytes, { subset: true });

  const url = buildCardUrl(c.slug);
  const qr = await pdf.embedPng(await qrBytes(c.slug));

  let page = pdf.addPage([A4.w, A4.h]);
  let y = A4.h;

  const newPage = () => {
    page = pdf.addPage([A4.w, A4.h]);
    y = A4.h - MARGIN;
  };

  const ensure = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };

  function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  const contentWidth = A4.w - MARGIN * 2;

  // ---------------------------------------------------------------- capa
  page.drawRectangle({
    x: 0,
    y: A4.h - 210,
    width: A4.w,
    height: 210,
    color: rgb(NAVY.r, NAVY.g, NAVY.b),
  });
  page.drawRectangle({
    x: 0,
    y: A4.h - 216,
    width: A4.w,
    height: 6,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });
  page.drawText("CONEXÃO IMPLANTES", {
    x: MARGIN,
    y: A4.h - 76,
    size: 11,
    font: bold,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });
  page.drawText("Como usar seus materiais digitais", {
    x: MARGIN,
    y: A4.h - 112,
    size: 21,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(c.nome, {
    x: MARGIN,
    y: A4.h - 146,
    size: 14,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(c.cargo || "", {
    x: MARGIN,
    y: A4.h - 166,
    size: 10,
    font: italic,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });
  page.drawText(
    `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
    { x: MARGIN, y: A4.h - 190, size: 8.5, font: regular, color: rgb(0.8, 0.83, 0.88) },
  );

  y = A4.h - 250;

  // QR + link
  const qrSize = 96;
  page.drawRectangle({
    x: MARGIN,
    y: y - qrSize - 16,
    width: contentWidth,
    height: qrSize + 32,
    color: rgb(0.96, 0.97, 0.98),
  });
  page.drawImage(qr, { x: MARGIN + 16, y: y - qrSize - 8, width: qrSize, height: qrSize });
  page.drawText("Seu Link Tree corporativo", {
    x: MARGIN + qrSize + 34,
    y: y - 22,
    size: 11,
    font: bold,
    color: rgb(TEXT.r, TEXT.g, TEXT.b),
  });
  for (const [i, line] of wrap(url, regular, 10, contentWidth - qrSize - 60).entries()) {
    page.drawText(line, {
      x: MARGIN + qrSize + 34,
      y: y - 40 - i * 14,
      size: 10,
      font: regular,
      color: rgb(NAVY.r, NAVY.g, NAVY.b),
    });
  }
  page.drawText(
    c.kitUrl ? `Kit digital: ${c.kitUrl}` : c.email || "",
    {
      x: MARGIN + qrSize + 34,
      y: y - 76,
      size: 9,
      font: regular,
      color: rgb(MUTED.r, MUTED.g, MUTED.b),
    },
  );

  y = y - qrSize - 52;

  // ------------------------------------------------------------- seções
  for (const section of sections(c, url)) {
    ensure(90);
    page.drawText(section.title, {
      x: MARGIN,
      y,
      size: 13,
      font: bold,
      color: rgb(NAVY.r, NAVY.g, NAVY.b),
    });
    y -= 8;
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: 42,
      height: 2.5,
      color: rgb(GOLD.r, GOLD.g, GOLD.b),
    });
    y -= 22;

    if (section.intro) {
      for (const line of wrap(section.intro, italic, 9.5, contentWidth)) {
        ensure(16);
        page.drawText(line, {
          x: MARGIN,
          y,
          size: 9.5,
          font: italic,
          color: rgb(MUTED.r, MUTED.g, MUTED.b),
        });
        y -= 14;
      }
      y -= 6;
    }

    for (const step of section.steps) {
      const lines = wrap(step, regular, 10, contentWidth - 18);
      ensure(lines.length * 14 + 8);
      page.drawCircle({
        x: MARGIN + 3.5,
        y: y + 3.2,
        size: 2.2,
        color: rgb(GOLD.r, GOLD.g, GOLD.b),
      });
      lines.forEach((line, i) => {
        page.drawText(line, {
          x: MARGIN + 18,
          y: y - i * 14,
          size: 10,
          font: regular,
          color: rgb(TEXT.r, TEXT.g, TEXT.b),
        });
      });
      y -= lines.length * 14 + 8;
    }

    y -= 14;
  }

  ensure(46);
  page.drawText(
    "Dúvidas? Fale com o time de Marketing da Conexão Implantes.",
    { x: MARGIN, y, size: 9, font: italic, color: rgb(MUTED.r, MUTED.g, MUTED.b) },
  );

  return pdf.save();
}
