import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MembershipRule, Member } from '../../types';
import { evaluateMemberTierRules, formatIDR } from '../../services/membershipEngine';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Cpu,
  Plus,
  Edit2,
  Trash2,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const RuleEngineConfig: React.FC = () => {
  const { rules, tiers, members, saveRule, deleteRule, systemSettings } = useApp();

  const [editingRule, setEditingRule] = useState<MembershipRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<MembershipRule | null>(null);

  // Test bench simulator state
  const [testMemberId, setTestMemberId] = useState<string>(members[0]?.id || '');
  const [testResult, setTestResult] = useState<any | null>(null);

  const defaultNewRule: MembershipRule = {
    id: `rule_${Date.now()}`,
    name: 'Kenaikan Tier Baru',
    conditionType: 'spending',
    primaryThreshold: 20000000,
    action: 'upgrade',
    targetTierId: tiers[1]?.id || 'tier_silver',
    description: 'Aturan otomatis upgrade jika syarat terpenuhi.',
    isActive: true,
  };

  const handleEdit = (rule: MembershipRule) => {
    setEditingRule({ ...rule });
  };

  const handleAdd = () => {
    setEditingRule({ ...defaultNewRule, id: `rule_${Date.now()}` });
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;
    saveRule(editingRule);
    setEditingRule(null);
  };

  const handleRunSimulation = () => {
    const testMember = members.find((m) => m.id === testMemberId);
    if (!testMember) return;
    const res = evaluateMemberTierRules(
      testMember,
      tiers,
      rules,
      systemSettings.autoUpgradeEnabled
    );
    setTestResult({ member: testMember, result: res });
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif-luxury text-xs uppercase tracking-widest text-emerald-800 font-bold">
              Dynamic Rule Engine
            </span>
            <span className="text-stone-300">·</span>
            <span className="text-xs text-stone-500 font-mono">
              Automation Core
            </span>
          </div>
          <h1 className="font-serif-luxury text-2xl font-bold text-stone-900 mt-1">
            Aturan Kenaikan & Evaluasi Membership
          </h1>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
            Mesin aturan dinamis mengevaluasi setiap transaksi dan kunjungan secara
            otomatis. Hotel dapat menambah aturan baru tanpa perlu menyentuh source code.
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat Aturan Baru</span>
        </button>
      </div>

      {/* Rules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => {
          const targetTier = tiers.find((t) => t.id === rule.targetTierId);

          return (
            <div
              key={rule.id}
              className={`p-5 rounded-2xl border transition-all duration-200 ${
                rule.isActive
                  ? 'bg-white border-stone-200 shadow-xs'
                  : 'bg-stone-50 border-stone-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-stone-900">
                      {rule.name}
                    </h3>
                    <span className="text-[10px] font-mono text-stone-400 uppercase">
                      Kondisi: {rule.conditionType.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(rule)}
                    className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRuleToDelete(rule)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Logic Clause Formula Representation */}
              <div className="mt-4 p-3.5 bg-stone-900 text-stone-100 rounded-xl font-mono text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-stone-400 text-[11px]">
                  <span>IF:</span>
                  <span className="text-amber-300 font-semibold">
                    {rule.conditionType === 'spending'
                      ? `total_spending >= ${formatIDR(rule.primaryThreshold)}`
                      : rule.conditionType === 'stays'
                      ? `stay_count >= ${rule.primaryThreshold} kunjungan`
                      : `points >= ${rule.primaryThreshold} pts`}
                  </span>
                </div>
                {rule.secondaryConditionType && (
                  <div className="flex items-center gap-2 text-stone-400 text-[11px]">
                    <span>AND:</span>
                    <span className="text-amber-300 font-semibold">
                      {rule.secondaryConditionType} &gt;= {rule.secondaryThreshold}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-stone-400 text-[11px] pt-1 border-t border-stone-800">
                  <span>THEN:</span>
                  <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    {rule.action} → {targetTier?.name || 'Tier'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-stone-600 mt-3 leading-relaxed">
                {rule.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Simulator Test Bench Section */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 border border-stone-800 space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="font-serif-luxury text-lg font-bold">
            Simulasi Mesin Aturan (Rule Engine Test Bench)
          </h3>
        </div>
        <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
          Uji coba secara langsung apakah data belanja dan kunjungan seorang tamu
          memenuhi salah satu aturan kenaikan tier di atas sebelum diaplikasikan.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={testMemberId}
            onChange={(e) => setTestMemberId(e.target.value)}
            className="flex-1 w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-xs text-stone-100 font-mono"
          >
            {members.map((m) => {
              const tier = tiers.find((t) => t.id === m.tierId);
              return (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.membershipNumber}) — Saat ini:{' '}
                  {tier?.name || 'Member'} | Belanja: Rp{' '}
                  {(m.totalSpending / 1000000).toFixed(1)}Jt | {m.totalVisits}x Stay
                </option>
              );
            })}
          </select>

          <button
            onClick={handleRunSimulation}
            className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <Play className="w-4 h-4 fill-stone-950" />
            <span>Jalankan Simulasi Evaluasi</span>
          </button>
        </div>

        {testResult && (
          <div className="p-4 bg-stone-800/80 rounded-2xl border border-stone-700 animate-in fade-in">
            {testResult.result.upgraded ? (
              <div className="flex items-start gap-3 text-xs text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm text-white">
                    Memenuhi Syarat Kenaikan ke Tier {testResult.result.newTier.name}!
                  </div>
                  <div className="mt-1 text-stone-300">
                    Alasan pemicu: {testResult.result.reason}
                  </div>
                  <div className="mt-1 text-[11px] text-stone-400 font-mono">
                    Aturan yang terpicu: {testResult.result.ruleTriggered.name}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 text-xs text-stone-400">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-stone-200">
                    Belum Memenuhi Syarat Kenaikan Tier Lebih Tinggi
                  </div>
                  <div className="mt-1">
                    Member saat ini berada pada tier yang sudah sesuai dengan akumulasi
                    pembelanjaan dan kunjungan saat ini.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <Modal
          isOpen={true}
          onClose={() => setEditingRule(null)}
          title="Konfigurasi Aturan Rule Engine"
          subtitle="Tentukan kondisi pemicu otomatis dan aksi kenaikan tier"
          maxWidth="xl"
        >
          <form onSubmit={handleSaveSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nama Aturan *
              </label>
              <input
                type="text"
                value={editingRule.name}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Kondisi Utama (Condition Type)
                </label>
                <select
                  value={editingRule.conditionType}
                  onChange={(e: any) =>
                    setEditingRule({ ...editingRule, conditionType: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                >
                  <option value="spending">Akumulasi Spending (IDR)</option>
                  <option value="stays">Frekuensi Kunjungan (Stay Count)</option>
                  <option value="points">Akumulasi Poin Loyalitas</option>
                  <option value="combo">Kombinasi (Spending & Stay)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Ambang Batas Nilai (Threshold) *
                </label>
                <input
                  type="number"
                  value={editingRule.primaryThreshold}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      primaryThreshold: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Aksi Mesin (Action)
                </label>
                <select
                  value={editingRule.action}
                  onChange={(e: any) =>
                    setEditingRule({ ...editingRule, action: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                >
                  <option value="upgrade">Upgrade Membership</option>
                  <option value="bonus_points">Berikan Bonus Poin</option>
                  <option value="downgrade">Downgrade Membership</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Target Tier Kenaikan
                </label>
                <select
                  value={editingRule.targetTierId || ''}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, targetTierId: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                >
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Lvl {t.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Keterangan Logis Aturan
              </label>
              <textarea
                rows={2}
                value={editingRule.description}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, description: e.target.value })
                }
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-xs"
              >
                Simpan Aturan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Rule Dialog */}
      <ConfirmDialog
        isOpen={Boolean(ruleToDelete)}
        onClose={() => setRuleToDelete(null)}
        onConfirm={() => {
          if (ruleToDelete) deleteRule(ruleToDelete.id);
          setRuleToDelete(null);
        }}
        title={`Hapus Aturan ${ruleToDelete?.name}?`}
        message="Aturan ini tidak akan lagi dijalankan secara otomatis saat tamu mencatat transaksi atau check-in."
        confirmText="Hapus Aturan"
        isDestructive
      />
    </div>
  );
};
