import { Ranked, explain } from "../search/ranking";
// Explanations are assembled from measured contributions, never free-form model claims.
export const explainRecommendation = (r: Ranked) => explain(r);
