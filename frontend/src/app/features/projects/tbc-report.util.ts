/**
 * Détection des rapports HTML TBC (« Résultats de fermeture de boucle GNSS ») dans un
 * dossier sélectionné (webkitdirectory). Partagé entre le wizard d'ajout et la page de
 * modification d'une pièce.
 *
 * Pour chaque fichier cadre (frameset), résout son fichier de données : chemin exact du
 * `src`, sinon convention TBC « <nom du cadre>_files/<body> » (le `src` interne peut être
 * obsolète après renommage), sinon nom de base sous le dossier du cadre. Ajoute aussi les
 * rapports autonomes (HTML avec données hors de tout dossier « _files »).
 */
export interface TbcReportCandidate {
  file: File;
  label: string;
  source: string;
}

/** Marqueurs de données par type de pièce (le body du rapport doit en contenir). */
const TBC_MARKERS: Record<string, RegExp[]> = {
  RFB: [/ΔX/, /Boucle\s*:/],
  // RDL/RDN/RDD : même format « ajustement du réseau » (table des coordonnées ajustées).
  RDL: [/Abscisse(?:&nbsp;|\s)*Erreur/i],
  RDN: [/Abscisse(?:&nbsp;|\s)*Erreur/i],
  RDD: [/Abscisse(?:&nbsp;|\s)*Erreur/i],
};
const relPath = (f: File) => (((f as any).webkitRelativePath as string) || f.name).toLowerCase();
const dirOf = (p: string) => { const i = p.lastIndexOf('/'); return i >= 0 ? p.slice(0, i) : ''; };
const baseNoExt = (name: string) => name.replace(/\.[^.]+$/, '').toLowerCase();
const norm = (p: string) => {
  const out: string[] = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') out.pop(); else out.push(seg);
  }
  return out.join('/');
};

export async function findTbcReports(files: File[], typeCode: string): Promise<TbcReportCandidate[]> {
  const markers = TBC_MARKERS[typeCode] || [];
  const hasData = (t: string) => markers.some(m => m.test(t));
  const htmls = files.filter(f => /\.html?$/i.test(f.name));
  const list = await Promise.all(
    htmls.map(f => f.text().then(t => ({ f, t })).catch(() => ({ f, t: '' }))),
  );

  const candidates: TbcReportCandidate[] = [];
  const taken = new Set<File>();

  // 1) Rapports « cadre » (frameset → body).
  for (const { f, t } of list) {
    if (!/<frameset/i.test(t)) continue;
    const m = t.match(/name=["']BodyFrame["'][^>]*\bsrc=["']([^"']+)["']/i)
      || t.match(/\bsrc=["']([^"']+)["'][^>]*name=["']BodyFrame["']/i);
    if (!m) continue;
    const src = decodeURIComponent(m[1]).replace(/\\/g, '/');
    const srcName = src.split('/').pop()!.toLowerCase();
    const fdir = dirOf(norm(relPath(f)));
    const tryPaths = [
      norm(fdir + '/' + src),
      norm(fdir + '/' + baseNoExt(f.name) + '_files/' + srcName),
    ];
    let body = list.find(x => tryPaths.includes(norm(relPath(x.f))) && hasData(x.t));
    if (!body) {
      body = list.find(x => {
        const rp = norm(relPath(x.f));
        return x.f !== f && rp.startsWith(fdir + '/') && rp.endsWith('/' + srcName) && hasData(x.t);
      });
    }
    if (body && !taken.has(body.f)) {
      const titleM = t.match(/<title[^>]*>([^<]*)<\/title>/i);
      candidates.push({ file: body.f, label: (titleM?.[1]?.trim()) || f.name, source: f.name });
      const filesDir = dirOf(norm(relPath(body.f)));
      for (const x of list) if (x.f === body.f || norm(relPath(x.f)).startsWith(filesDir + '/')) taken.add(x.f);
    }
  }
  // 2) Rapports autonomes : HTML avec données, HORS de tout dossier « _files ».
  for (const { f, t } of list) {
    if (taken.has(f) || /<frameset/i.test(t) || /_files\//i.test(norm(relPath(f))) || !hasData(t)) continue;
    const titleM = t.match(/<title[^>]*>([^<]*)<\/title>/i);
    candidates.push({ file: f, label: (titleM?.[1]?.trim()) || f.name, source: f.name });
    taken.add(f);
  }
  return candidates;
}
