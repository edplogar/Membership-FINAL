import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { exportToCSV } from '../../services/exportService';
import { Shield, Download, Search, Filter, History } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  const filteredLogs = auditLogs.filter((log) => {
    const matchSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.newValue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.oldValue?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchModule = moduleFilter === 'all' || log.module === moduleFilter;
    return matchSearch && matchModule;
  });

  const handleExportCSV = () => {
    const headers = [
      'Timestamp',
      'User',
      'Email',
      'Role',
      'Aksi',
      'Modul',
      'Record ID',
      'Nilai Sebelumnya',
      'Nilai Baru',
      'IP Address',
    ];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.userName,
      l.userEmail,
      l.userRole,
      l.action,
      l.module,
      l.recordId,
      l.oldValue || '-',
      l.newValue || '-',
      l.ipAddress,
    ]);
    exportToCSV('LGH_Audit_Trail_Security', headers, rows);
  };

  const modules = Array.from(new Set(auditLogs.map((l) => l.module)));

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-luxury text-2xl font-bold text-stone-900">
            Jejak Audit & Log Keamanan (Audit Logs)
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Merekam seluruh aktivitas operasional krusial mencakup siapa, apa, kapan, sebelum, dan sesudah perubahan.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Ekspor Log Audit (CSV)</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari aksi, nama staf, nilai perubahan..."
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-700/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-stone-400 text-xs font-semibold whitespace-nowrap">
            Modul:
          </span>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
          >
            <option value="all">Semua Modul</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-500 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3.5">Waktu (WITA)</th>
                <th className="px-5 py-3.5">Pelaksana (Who)</th>
                <th className="px-5 py-3.5">Aksi & Modul</th>
                <th className="px-5 py-3.5">Sebelum (Before)</th>
                <th className="px-5 py-3.5">Sesudah (After)</th>
                <th className="px-5 py-3.5">Alamat IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-stone-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-stone-900">{log.userName}</div>
                    <div className="text-[10px] text-stone-400 font-mono">
                      {log.userRole} · {log.userEmail}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono font-bold text-stone-800 uppercase text-[11px] block">
                      {log.action}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-stone-500 max-w-xs truncate font-mono text-[11px]">
                    {log.oldValue || '-'}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-stone-800 max-w-sm">
                    {log.newValue}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-stone-400 text-[10px]">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
