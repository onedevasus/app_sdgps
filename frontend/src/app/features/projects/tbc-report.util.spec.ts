import { findTbcReports } from './tbc-report.util';

/** Crée un File avec un webkitRelativePath simulé (comme un input webkitdirectory). */
function makeFile(relPath: string, content: string): File {
  const name = relPath.split('/').pop()!;
  const f = new File([content], name, { type: 'text/html' });
  Object.defineProperty(f, 'webkitRelativePath', { value: relPath });
  return f;
}

describe('tbc-report.util / findTbcReports', () => {
  it('détecte un rapport autonome (HTML avec données, hors _files)', async () => {
    const report = makeFile(
      'dossier/rapport.html',
      '<html><head><title>  Mon RFB  </title></head><body>Boucle : 1 ΔX = 0.01</body></html>'
    );
    const res = await findTbcReports([report], 'RFB');
    expect(res.length).toBe(1);
    expect(res[0].file).toBe(report);
    expect(res[0].label).toBe('Mon RFB');
    expect(res[0].source).toBe('rapport.html');
  });

  it('utilise le nom de fichier comme label quand il n’y a pas de titre', async () => {
    const report = makeFile('r.html', '<body>Boucle : ΔX</body>');
    const res = await findTbcReports([report], 'RFB');
    expect(res[0].label).toBe('r.html');
  });

  it('ignore un HTML sans marqueur de données pour le type demandé', async () => {
    const report = makeFile('r.html', '<body>rien de pertinent</body>');
    const res = await findTbcReports([report], 'RFB');
    expect(res.length).toBe(0);
  });

  it('résout un rapport cadre (frameset → body dans <nom>_files)', async () => {
    const frame = makeFile(
      'dossier/cadre.html',
      `<html><head><title>Fermeture GNSS</title></head>
       <frameset><frame name="BodyFrame" src="cadre_files/body.html"></frameset></html>`
    );
    const body = makeFile('dossier/cadre_files/body.html', '<body>Boucle : ΔX = 0.02</body>');
    const res = await findTbcReports([frame, body], 'RFB');
    expect(res.length).toBe(1);
    expect(res[0].file).toBe(body);
    expect(res[0].label).toBe('Fermeture GNSS');
    expect(res[0].source).toBe('cadre.html');
  });

  it('n’ajoute pas en doublon le body déjà pris par un cadre', async () => {
    const frame = makeFile(
      'd/cadre.html',
      `<frameset><frame name="BodyFrame" src="cadre_files/body.html"></frameset>`
    );
    const body = makeFile('d/cadre_files/body.html', '<body>Boucle : ΔX</body>');
    const res = await findTbcReports([frame, body], 'RFB');
    // Le body est référencé par le cadre → une seule entrée, pas de rapport autonome en double.
    expect(res.length).toBe(1);
  });

  it('utilise les marqueurs RDL/RDN/RDD (ajustement de réseau)', async () => {
    const report = makeFile('r.html', '<body>Abscisse&nbsp;Erreur</body>');
    const res = await findTbcReports([report], 'RDL');
    expect(res.length).toBe(1);
  });
});
