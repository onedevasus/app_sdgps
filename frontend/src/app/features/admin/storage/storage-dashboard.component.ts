import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, HostListener,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import {
  StorageAnalyticsService, StorageOverview, StorageEvolutionPoint, StorageRankItem,
} from '../../../core/services/storage-analytics.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

type RankTab = 'by_organization' | 'by_project' | 'by_user';
type EvoDim = 'total' | 'by_organization' | 'by_project' | 'by_role' | 'by_user';

@Component({
  selector: 'app-storage-dashboard',
  templateUrl: './storage-dashboard.component.html',
  styleUrls: ['./storage-dashboard.component.scss'],
})
export class StorageDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('typeCanvas') typeCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rankCanvas') rankCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('evoCanvas') evoCanvas!: ElementRef<HTMLCanvasElement>;

  loading = true;
  error = '';
  overview: StorageOverview | null = null;
  evolution: StorageEvolutionPoint[] = [];
  organizations: { id: string; name: string }[] = [];
  selectedOrg: string | null = null;
  rankTab: RankTab = 'by_organization';

  // Dimension suivie par le graphe d'évolution (Total ou ventilation par …).
  evoDim: EvoDim = 'total';
  readonly evoDims: { key: EvoDim; label: string; icon: string }[] = [
    { key: 'total', label: 'Total', icon: 'fa-hard-drive' },
    { key: 'by_organization', label: 'Organisations', icon: 'fa-building' },
    { key: 'by_project', label: 'Projets', icon: 'fa-diagram-project' },
    { key: 'by_role', label: 'Rôles', icon: 'fa-user-shield' },
    { key: 'by_user', label: 'Utilisateurs', icon: 'fa-user' },
  ];
  // Nombre max de séries distinctes affichées (le reste est regroupé dans « Autres »).
  private static readonly MAX_SERIES = 6;
  // Palette pour les séries empilées (lisible en clair et sombre).
  private readonly seriesColors = [
    '#cc5858', '#3fa7d6', '#59a14f', '#e6a817', '#9c6ade',
    '#e07b39', '#4dc0b5', '#8a8f98',
  ];

  // Libellé de la pseudo-catégorie « sans organisation » renvoyée par le backend
  // (analytics.services.NON_ORG_LABEL) — exclue du décompte réel d'organisations.
  private readonly NON_ORG_LABEL = 'Hors organisation';

  // Auto-rafraîchissement : sondage périodique léger (le backend met en cache la
  // ventilation et n'en recalcule que si une donnée a changé → appels peu coûteux).
  private static readonly POLL_MS = 30_000;
  private pollTimer?: ReturnType<typeof setInterval>;

  private viewReady = false;
  private themeSub?: Subscription;
  private typeChart?: Chart;
  private rankChart?: Chart;
  private evoChart?: Chart;

  // Palette par nature de fichier (lisible en clair ET sombre).
  private readonly typeColors: Record<string, string> = {
    images: '#cc5858', csv: '#3fa7d6', excel: '#59a14f',
    html: '#e6a817', pdf: '#9c6ade', autres: '#8a8f98',
  };

  constructor(
    private storage: StorageAnalyticsService,
    private orgService: OrganizationService,
    private layout: LayoutService,
  ) {}

  ngOnInit(): void {
    this.orgService.getOrganizations().subscribe({
      next: (orgs: any[]) => { this.organizations = (orgs || []).map(o => ({ id: o.id, name: o.name })); },
      error: () => {},
    });
    this.loadOverview();
    this.loadEvolution();
    // Re-thématiser les graphes au changement de thème clair/sombre.
    this.themeSub = this.layout.theme$.subscribe(() => setTimeout(() => this.renderAll(), 0));
    // Sondage périodique : reflète les changements faits ailleurs (utilisateurs, orgs,
    // projets, pièces…) sans action de l'utilisateur. Suspendu si l'onglet est masqué.
    this.pollTimer = setInterval(() => {
      if (!document.hidden && !this.loading) this.refresh();
    }, StorageDashboardComponent.POLL_MS);
  }

  /** Rafraîchit au retour sur l'onglet (ex. après une modif faite dans un autre onglet). */
  @HostListener('window:focus')
  onWindowFocus(): void {
    if (!this.loading) this.refresh();
  }

  /** Recharge la ventilation ET la courbe d'évolution (bouton « Rafraîchir » + auto). */
  refresh(): void {
    this.loadOverview();
    this.loadEvolution();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderAll();
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
    if (this.pollTimer) clearInterval(this.pollTimer);
    [this.typeChart, this.rankChart, this.evoChart].forEach(c => c?.destroy());
  }

  // --- Données ---
  loadOverview(): void {
    this.loading = true;
    this.error = '';
    this.storage.getOverview(this.selectedOrg).subscribe({
      next: (data) => {
        this.overview = data;
        this.loading = false;
        setTimeout(() => { this.renderTypeChart(); this.renderRankChart(); }, 0);
      },
      error: () => { this.loading = false; this.error = "Impossible de charger les données de stockage."; },
    });
  }

  loadEvolution(): void {
    this.storage.getEvolution().subscribe({
      next: (res) => { this.evolution = res.points || []; setTimeout(() => this.renderEvoChart(), 0); },
      error: () => {},
    });
  }

  onOrgChange(): void { this.loadOverview(); }
  setRankTab(tab: RankTab): void { this.rankTab = tab; this.renderRankChart(); }
  setEvoDim(dim: EvoDim): void { this.evoDim = dim; this.renderEvoChart(); }

  // --- KPIs / helpers ---
  get topType(): string {
    const t = this.overview?.by_type?.[0];
    return t ? t.label : '—';
  }

  formatBytes(bytes: number, dec = 1): string {
    if (!bytes || bytes < 1) return '0 o';
    const k = 1024;
    const sizes = ['o', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : dec)} ${sizes[i]}`;
  }

  percent(bytes: number): number {
    const total = this.overview?.total_bytes || 0;
    return total ? Math.round((bytes / total) * 100) : 0;
  }

  get currentRank(): StorageRankItem[] {
    return this.overview ? this.overview[this.rankTab] : [];
  }

  /** Nombre d'organisations RÉELLES (hors pseudo-catégorie « Hors organisation »). */
  get orgCount(): number {
    return (this.overview?.by_organization || [])
      .filter(o => o.label !== this.NON_ORG_LABEL).length;
  }

  // --- Graphiques (Chart.js) ---
  private cssVar(name: string, fallback: string): string {
    const v = getComputedStyle(document.body).getPropertyValue(name).trim();
    return v || fallback;
  }

  private renderAll(): void {
    this.renderTypeChart();
    this.renderRankChart();
    this.renderEvoChart();
  }

  private renderTypeChart(): void {
    if (!this.viewReady || !this.typeCanvas || !this.overview) return;
    const text = this.cssVar('--text-color', '#ecf0f1');
    const items = this.overview.by_type;
    this.typeChart?.destroy();
    this.typeChart = new Chart(this.typeCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: items.map(t => t.label),
        datasets: [{
          data: items.map(t => t.bytes),
          backgroundColor: items.map(t => this.typeColors[t.key] || '#8a8f98'),
          borderColor: this.cssVar('--secondary-color', '#2d2d2d'),
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { color: text, usePointStyle: true, padding: 14, font: { size: 12 } } },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${this.formatBytes(Number(c.parsed))}` } },
        },
      },
    });
  }

  private renderRankChart(): void {
    if (!this.viewReady || !this.rankCanvas || !this.overview) return;
    const text = this.cssVar('--text-color', '#ecf0f1');
    const grid = this.cssVar('--border-color', '#404040');
    const accent = this.cssVar('--accent-color', '#cc5858');
    const items = this.currentRank.slice(0, 10);
    this.rankChart?.destroy();
    this.rankChart = new Chart(this.rankCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: items.map(i => i.label),
        datasets: [{ data: items.map(i => i.bytes), backgroundColor: accent, borderRadius: 6, maxBarThickness: 26 }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${this.formatBytes(Number(c.parsed.x))}` } },
        },
        scales: {
          x: { ticks: { color: text, callback: (v) => this.formatBytes(Number(v), 0) }, grid: { color: grid } },
          y: { ticks: { color: text, font: { size: 11 } }, grid: { display: false } },
        },
      },
    });
  }

  /** Séries à tracer selon la dimension : soit le total (1 série), soit les top-N clés de
   *  la ventilation choisie + « Autres » (aires empilées). */
  private buildEvoDatasets(): any[] {
    const points = this.evolution;
    if (this.evoDim === 'total') {
      const ctx = this.evoCanvas.nativeElement.getContext('2d');
      const gradient = ctx!.createLinearGradient(0, 0, 0, 240);
      gradient.addColorStop(0, 'rgba(204,88,88,0.35)');
      gradient.addColorStop(1, 'rgba(204,88,88,0.02)');
      const accent = this.cssVar('--accent-color', '#cc5858');
      return [{
        label: 'Stockage total', data: points.map(p => p.total_bytes),
        borderColor: accent, backgroundColor: gradient, fill: true, tension: 0.3,
        pointRadius: 2, pointHoverRadius: 5, pointBackgroundColor: accent, borderWidth: 2,
      }];
    }

    // Total par clé sur l'ensemble de la période → classe pour ne garder que les top-N.
    const totals = new Map<string, number>();
    for (const p of points) {
      const m = (p as any)[this.evoDim] as Record<string, number> || {};
      for (const [k, v] of Object.entries(m)) totals.set(k, (totals.get(k) || 0) + v);
    }
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const top = ranked.slice(0, StorageDashboardComponent.MAX_SERIES);
    const hasOthers = ranked.length > top.length;
    const othersKeys = new Set(ranked.slice(StorageDashboardComponent.MAX_SERIES));

    const series = top.map((key, i) => ({
      label: key,
      data: points.map(p => ((p as any)[this.evoDim]?.[key]) || 0),
      color: this.seriesColors[i % this.seriesColors.length],
    }));
    if (hasOthers) {
      series.push({
        label: 'Autres',
        data: points.map(p => {
          const m = (p as any)[this.evoDim] as Record<string, number> || {};
          let s = 0;
          for (const k of othersKeys) s += m[k] || 0;
          return s;
        }),
        color: '#8a8f98',
      });
    }
    return series.map(s => ({
      label: s.label, data: s.data,
      borderColor: s.color, backgroundColor: s.color + '55',
      fill: true, stack: 'stack', tension: 0.3,
      pointRadius: 0, pointHoverRadius: 4, borderWidth: 1.5,
    }));
  }

  private renderEvoChart(): void {
    if (!this.viewReady || !this.evoCanvas || !this.evolution.length) return;
    const text = this.cssVar('--text-color', '#ecf0f1');
    const grid = this.cssVar('--border-color', '#404040');
    const datasets = this.buildEvoDatasets();
    const stacked = this.evoDim !== 'total';
    this.evoChart?.destroy();
    this.evoChart = new Chart(this.evoCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: this.evolution.map(p => new Date(p.taken_at).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short', day: '2-digit' })),
        datasets,
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: stacked, position: 'bottom', labels: { color: text, usePointStyle: true, padding: 12, font: { size: 11 }, boxWidth: 8 } },
          tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${this.formatBytes(Number(c.parsed.y))}` } },
        },
        scales: {
          x: { stacked, ticks: { color: text, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
          y: { stacked, ticks: { color: text, callback: (v) => this.formatBytes(Number(v), 0) }, grid: { color: grid }, beginAtZero: true },
        },
      },
    });
  }
}
