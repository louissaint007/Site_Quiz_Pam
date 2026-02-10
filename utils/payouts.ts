
import { PayoutDistribution, Contest } from '../types';

export const calculatePayouts = (
  contest: Partial<Contest>
): PayoutDistribution => {
  // Fix: use entry_fee_htg instead of entry_fee to match Contest interface
  const entryFee = contest.entry_fee_htg || 0;
  const participantsCount = contest.min_participants || 1;
  const adminMarginPercent = contest.admin_margin_percent || 50;
  
  const totalRevenue = entryFee * participantsCount;
  const adminMargin = (totalRevenue * adminMarginPercent) / 100;
  const prizePool = totalRevenue - adminMargin;

  // Fix: first_prize_percent, second_prize_percent, and third_prize_percent now correctly typed in Contest
  const firstPrize = (totalRevenue * (contest.first_prize_percent || 20)) / 100;
  const secondPrize = (totalRevenue * (contest.second_prize_percent || 8)) / 100;
  const thirdPrize = (totalRevenue * (contest.third_prize_percent || 2)) / 100;
  
  // Le reste du top 20 (on garde la logique de 10% pour le top 20 si non spécifié, 
  // ou on déduit ce qui reste du prize pool pour les autres gagnants)
  const top20Shared = (totalRevenue * 10) / 100;
  const perTop20Member = top20Shared / 17;

  return {
    totalPool: prizePool,
    adminMargin,
    firstPrize,
    secondPrize,
    thirdPrize,
    top20Shared,
    perTop20Member
  };
};
