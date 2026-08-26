import React from "react";
import {
  CalendarDays,
  ChevronDown,
  CloudSun,
  Droplets,
  MapPin,
  Thermometer,
  Users,
  Wind,
} from "lucide-react";
import "./dashboard-glass-reference.css";

type DashboardGlassData = {
  location?: string;
  temperature?: number | string;
  weatherLabel?: string;
  feelsLike?: number | string;
  humidity?: number | string;
  wind?: number | string;
  employees?: number | string;
  progress?: number;
  goalsTotal?: number;
  goalsDone?: number;
  goalsRemaining?: number;
  present?: number | string;
  absences?: number | string;
  external?: number | string;
  equipmentPercent?: number;
  equipmentActive?: number;
  equipmentTotal?: number;
  dateLabel?: string;
};

type Props = {
  data?: DashboardGlassData;
};

function Ring({
  value = 0,
  label,
  size = 164,
}: {
  value?: number;
  label: string;
  size?: number;
}) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const offset = c - (pct / 100) * c;

  return (
    <div className="dgv4-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={`gold-${label}`} x1="0" x2="1">
            <stop offset="0%" stopColor="#a98247" />
            <stop offset="100%" stopColor="#d8b36e" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(59,62,64,.10)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#gold-${label})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="dgv4-ring-center">
        <strong>{pct}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function MiniLine({ variant = 1 }: { variant?: number }) {
  const path =
    variant === 1
      ? "M0 62 C30 35,52 58,78 42 S126 15,156 35 S202 10,246 35"
      : "M0 68 C35 52,52 70,78 42 S120 26,145 45 S185 10,220 30 S238 58,246 64";
  return (
    <svg className="dgv4-mini-svg" viewBox="0 0 246 82" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`area-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(181,138,72,.18)" />
          <stop offset="100%" stopColor="rgba(181,138,72,0)" />
        </linearGradient>
      </defs>
      <path d={`${path} L246 82 L0 82 Z`} fill={`url(#area-${variant})`} />
      <path d={path} fill="none" stroke="#a98146" strokeWidth="1.5" />
    </svg>
  );
}

function MiniBars() {
  const heights = [32, 24, 46, 34, 68, 17, 28];
  return (
    <div className="dgv4-bars">
      {heights.map((h, i) => (
        <span key={i} style={{ height: h }} />
      ))}
    </div>
  );
}

export default function DashboardGlassReference({ data = {} }: Props) {
  const d = {
    location: data.location ?? "Barcarena – Vila do Conde",
    temperature: data.temperature ?? "26",
    weatherLabel: data.weatherLabel ?? "Parcialmente nublado",
    feelsLike: data.feelsLike ?? "30",
    humidity: data.humidity ?? "90",
    wind: data.wind ?? "12",
    employees: data.employees ?? "46",
    progress: data.progress ?? 77,
    goalsTotal: data.goalsTotal ?? 10,
    goalsDone: data.goalsDone ?? 5,
    goalsRemaining: data.goalsRemaining ?? 6,
    present: data.present ?? 0,
    absences: data.absences ?? 0,
    external: data.external ?? 0,
    equipmentPercent: data.equipmentPercent ?? 79,
    equipmentActive: data.equipmentActive ?? 15,
    equipmentTotal: data.equipmentTotal ?? 19,
    dateLabel: data.dateLabel ?? "26 de agosto de 2026",
  };

  return (
    <section className="dashboard-glass-v4">
      <div className="dgv4-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral da operação</p>
        </div>

        <button className="dgv4-date" type="button">
          <CalendarDays size={22} strokeWidth={1.6} />
          <span>{d.dateLabel}</span>
          <ChevronDown size={17} strokeWidth={1.6} />
        </button>
      </div>

      <div className="dgv4-grid">
        <div className="dgv4-col dgv4-col-left">
          <article className="dgv4-card dgv4-weather">
            <div className="dgv4-weather-head">
              <span><MapPin size={15} /> {d.location}</span>
              <span className="dgv4-live"><i /> Tempo Real</span>
            </div>

            <div className="dgv4-temp-row">
              <CloudSun className="dgv4-weather-icon" size={58} strokeWidth={1.25} />
              <div>
                <strong className="dgv4-temp">{d.temperature}°</strong>
                <p>{d.weatherLabel}</p>
              </div>
            </div>

            <div className="dgv4-weather-stats">
              <div><span><Thermometer size={16} /> Sensação</span><b>{d.feelsLike}°</b></div>
              <div><span><Droplets size={16} /> Umidade</span><b>{d.humidity}%</b></div>
              <div><span><Wind size={16} /> Vento</span><b>{d.wind} km/h</b></div>
            </div>
          </article>

          <article className="dgv4-card dgv4-employees">
            <div className="dgv4-card-title">
              <span>TOTAL DE FUNCIONÁRIOS</span>
              <Users size={19} strokeWidth={1.5} />
            </div>
            <div className="dgv4-employee-body">
              <Users className="dgv4-ghost-users" size={90} strokeWidth={1.2} />
              <strong>{d.employees}</strong>
              <span>Colaboradores ativos</span>
            </div>
          </article>
        </div>

        <div className="dgv4-col">
          <article className="dgv4-card dgv4-progress">
            <div className="dgv4-card-title dgv4-progress-title">
              <div>
                <span>AVANÇO MENSAL</span>
                <small>Metas do Planejamento</small>
              </div>
              <button type="button">Ver tudo →</button>
            </div>

            <div className="dgv4-ring-wrap">
              <Ring value={d.progress} label="AVANÇO" size={164} />
            </div>

            <div className="dgv4-goal-counts">
              <div><strong>{d.goalsTotal}</strong><span>TOTAL</span></div>
              <div className="is-done"><strong>{d.goalsDone}</strong><span>CONCLUÍDAS</span></div>
              <div className="is-left"><strong>{d.goalsRemaining}</strong><span>FALTAM</span></div>
            </div>

            <div className="dgv4-progressbar">
              <span style={{ width: `${Math.max(0, Math.min(100, d.progress))}%` }} />
            </div>
            <p className="dgv4-caption">{d.goalsDone} de {d.goalsTotal} metas concluídas</p>
          </article>
        </div>

        <div className="dgv4-col">
          <article className="dgv4-card dgv4-small">
            <div className="dgv4-card-title"><span>PRESENTES HOJE</span><Users size={18} /></div>
            <strong className="dgv4-small-number">{d.present}</strong>
            <MiniLine variant={1} />
            <div className="dgv4-axis"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span></div>
          </article>

          <article className="dgv4-card dgv4-small">
            <div className="dgv4-card-title"><span>AUSÊNCIAS</span><CalendarDays size={17} /></div>
            <strong className="dgv4-small-number">{d.absences}</strong>
            <MiniBars />
            <div className="dgv4-axis dgv4-axis-days"><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span></div>
          </article>

          <article className="dgv4-card dgv4-small">
            <div className="dgv4-card-title"><span>TRABALHO EXTERNO</span><Users size={17} /></div>
            <strong className="dgv4-small-number">{d.external}</strong>
            <MiniLine variant={2} />
            <div className="dgv4-axis"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span></div>
          </article>
        </div>

        <div className="dgv4-col">
          <article className="dgv4-card dgv4-equipment">
            <div className="dgv4-card-title dgv4-progress-title">
              <span>EQUIPAMENTOS ATIVOS</span>
              <button type="button">Ver tudo →</button>
            </div>

            <div className="dgv4-equipment-ring">
              <Ring value={d.equipmentPercent} label="EM USO" size={176} />
            </div>

            <div className="dgv4-equipment-count">
              <strong>{d.equipmentActive}</strong>
              <span> de {d.equipmentTotal}</span>
              <p>equipamentos em uso</p>
            </div>

            <div className="dgv4-progressbar">
              <span style={{ width: `${Math.max(0, Math.min(100, d.equipmentPercent))}%` }} />
            </div>

            <p className="dgv4-equipment-caption">
              {d.equipmentActive} no canteiro de {d.equipmentTotal} equipamentos
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
