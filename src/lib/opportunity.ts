import type { FactorKey, Recommendation } from "@/types/domain";

export const FACTORS: { key: FactorKey; label: string; hint: string }[] = [
  { key: "retorno", label: "Retorno potencial", hint: "1 baixo · 5 alto" },
  { key: "urgencia", label: "Urgência", hint: "1 pode esperar · 5 imediata" },
  { key: "esforco", label: "Esforço / energia", hint: "1 leve · 5 pesado" },
  { key: "complexidade", label: "Complexidade", hint: "1 simples · 5 complexa" },
  { key: "custo_oportunidade", label: "Custo de oportunidade", hint: "1 baixo · 5 alto" },
  { key: "capacidade", label: "Capacidade de execução da equipe", hint: "1 nenhuma · 5 total" },
  {
    key: "conectar",
    label: "Potencial de conectar alguém da rede",
    hint: "1 ninguém · 5 alguém ideal",
  },
];

export interface RecommendationResult {
  decision: Recommendation;
  reasons: string[];
}

/** Regras explicáveis. Uma recomendação nunca é aprovação automática. */
export function recommend(s: Record<FactorKey, number>): RecommendationResult {
  const cost = s.esforco + s.complexidade + s.custo_oportunidade;
  if (s.retorno <= 2 && s.urgencia <= 2) {
    return {
      decision: "ENCERRAR",
      reasons: [
        `Retorno (${s.retorno}) e urgência (${s.urgencia}) baixos não justificam energia da equipe.`,
        "Registre o aprendizado e libere a atenção para outras frentes.",
      ],
    };
  }
  if (s.capacidade >= 4 && cost <= 9) {
    return {
      decision: "RESOLVER",
      reasons: [
        `A equipe tem capacidade de execução (${s.capacidade}/5).`,
        `Custo somado de esforço, complexidade e oportunidade é aceitável (${cost}/15).`,
      ],
    };
  }
  if (s.conectar >= 4) {
    return {
      decision: "CONECTAR",
      reasons: [
        `Há alguém na rede com alto potencial de resolver (${s.conectar}/5).`,
        s.capacidade < 4
          ? `A equipe não tem capacidade suficiente internamente (${s.capacidade}/5).`
          : `Resolver internamente custaria caro (${cost}/15).`,
      ],
    };
  }
  return {
    decision: "ADIAR",
    reasons: [
      "Nem a equipe nem a rede têm hoje condição clara de resolver.",
      "Defina uma data de reavaliação e as lacunas de informação a preencher.",
    ],
  };
}
