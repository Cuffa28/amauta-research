// The built-in PDF Helvetica font does not contain the Unicode minus/approximation glyphs.
// Preserve their financial meaning instead of silently rendering an empty glyph.
export function pdfText(value: string) {
  return value.replace(/−/g, "-").replace(/≈/g, "aprox. ").replace(/[\u00a0\u202f]/g, " ");
}

export function pdfParagraph(value: string) {
  return pdfText(value.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, ""));
}

export function pdfSections(body: string) {
  const sections: { title: string; paragraphs: string[] }[] = [];
  for (const block of body.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)) {
    if (/^#{1,3}\s+/.test(block)) {
      const title = block.replace(/^#{1,3}\s+/, "");
      if (/^Fuentes y cobertura$/i.test(title)) break;
      sections.push({ title, paragraphs: [] });
    } else if (!/^!\[|^Facundo Argañaraz/.test(block)) {
      if (!sections.length) sections.push({ title: "", paragraphs: [] });
      sections[sections.length - 1].paragraphs.push(block);
    }
  }
  return sections;
}
