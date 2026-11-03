import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Member, MembershipTier } from '../../types';
import { Search, User, Phone, Check, X, Shield, Sparkles, ChevronDown, UserCheck } from 'lucide-react';

interface MemberSearchSelectProps {
  members: Member[];
  tiers: MembershipTier[];
  selectedMemberId: string;
  onSelectMember: (member: Member) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  helperText?: string;
}

const DEFAULT_TIER: MembershipTier = {
  id: 'tier_member',
  name: 'Member',
  level: 1,
  minSpending: 0,
  minStays: 0,
  minNights: 0,
  pointMultiplier: 1,
  roomDiscountPercent: 0,
  fnbDiscountPercent: 0,
  spaDiscountPercent: 0,
  benefits: [],
  colorHex: '#00A651',
  badgeBg: 'bg-emerald-600',
  icon: 'Shield',
  validityMonths: 12,
  description: 'Tier Standar',
  isActive: true,
};

export const MemberSearchSelect: React.FC<MemberSearchSelectProps> = ({
  members = [],
  tiers = [],
  selectedMemberId,
  onSelectMember,
  label = 'Pilih & Cari Member Tamu',
  placeholder = 'Cari berdasarkan Nama, No. Member (LGH-...), atau No. HP / WhatsApp...',
  required = true,
  className = '',
  helperText,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const safeTiers = useMemo(() => {
    if (Array.isArray(tiers) && tiers.length > 0) return tiers;
    return [DEFAULT_TIER];
  }, [tiers]);

  const selectedMember = useMemo(
    () => (Array.isArray(members) ? members.find((m) => m?.id === selectedMemberId) : null) || null,
    [members, selectedMemberId]
  );

  const selectedTier = useMemo(
    () => safeTiers.find((t) => t.id === selectedMember?.tierId) || safeTiers[0] || DEFAULT_TIER,
    [safeTiers, selectedMember]
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter members based on query (by Name, Membership Number, or Phone)
  const filteredMembers = useMemo(() => {
    if (!Array.isArray(members)) return [];
    const cleanQuery = (query || '').toLowerCase().trim();
    if (!cleanQuery) return members.slice(0, 8); // Top 8 members by default

    const cleanDigits = cleanQuery.replace(/[^0-9]/g, '');

    return members
      .filter((m) => {
        if (!m) return false;
        const fullName = m.fullName || '';
        const nickname = m.nickname || '';
        const membershipNumber = m.membershipNumber || '';
        const phone = m.phone || '';
        const email = m.email || '';

        const matchName =
          fullName.toLowerCase().includes(cleanQuery) ||
          nickname.toLowerCase().includes(cleanQuery);

        const matchNumber =
          membershipNumber.toLowerCase().includes(cleanQuery) ||
          membershipNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().includes(cleanQuery.replace(/[^a-zA-Z0-9]/g, ''));

        const cleanPhoneDigits = phone.replace(/[^0-9]/g, '');
        const matchPhone =
          phone.includes(cleanQuery) ||
          (cleanDigits.length >= 3 && cleanPhoneDigits.includes(cleanDigits));

        const matchEmail = email.toLowerCase().includes(cleanQuery);

        return matchName || matchNumber || matchPhone || matchEmail;
      })
      .slice(0, 10);
  }, [members, query]);

  const handleSelect = (member: Member) => {
    onSelectMember(member);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-stone-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {selectedMember && !isOpen && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="text-[11px] font-semibold text-[#00A651] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Cari Member Lain</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Selected Member Display Card (if not currently searching) */}
      {selectedMember && !isOpen ? (
        <div
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="p-3 bg-stone-50 hover:bg-[#00A651]/5 border border-stone-200 hover:border-[#00A651]/50 rounded-xl transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Member Avatar / Initial */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-serif text-sm font-bold text-white shadow-xs shrink-0"
                style={{ backgroundColor: selectedTier?.colorHex || '#00A651' }}
              >
                {(selectedMember.fullName || 'M').charAt(0).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-[#00A651] transition-colors">
                    {selectedMember.fullName || 'Tamu Hotel'}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${selectedTier?.colorHex || '#00A651'}15`,
                      color: selectedTier?.colorHex || '#00A651',
                    }}
                  >
                    <Shield className="w-2.5 h-2.5" />
                    {selectedTier?.name || 'Member'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 text-[10px] font-mono font-bold">
                    {selectedMember.status || 'ACTIVE'}
                  </span>
                </div>

                <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-[#00A651] font-semibold bg-[#00A651]/10 px-1.5 py-0.2 rounded">
                    {selectedMember.membershipNumber || '-'}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-stone-600">
                    <Phone className="w-3 h-3 text-stone-400" />
                    {selectedMember.phone || '-'}
                  </span>
                  <span className="text-amber-700 font-semibold font-mono">
                    {(selectedMember.availablePoints || 0).toLocaleString('id-ID')} pts
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <span className="text-[11px] font-semibold text-stone-400 group-hover:text-[#00A651] flex items-center gap-1">
                <span>Ganti</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Search Input & Live Results Dropdown */
        <div className="relative">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] shadow-2xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Search Helper Badges */}
          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-stone-500 overflow-x-auto pb-0.5">
            <span className="text-stone-400 shrink-0 font-medium">Bisa cari berdasarkan:</span>
            <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-mono shrink-0">Nama</span>
            <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-mono shrink-0">No. HP / WA</span>
            <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-mono shrink-0">No. Kartu (LGH-...)</span>
          </div>

          {/* Autocomplete Dropdown List */}
          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-stone-200 rounded-2xl shadow-xl max-h-72 overflow-y-auto divide-y divide-stone-100 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-2 bg-stone-50/90 text-[11px] font-semibold text-stone-500 border-b border-stone-100 flex items-center justify-between sticky top-0 backdrop-blur-xs z-10">
                <span>Hasil Pencarian ({filteredMembers.length} member)</span>
                <span className="text-[10px] text-stone-400">Klik untuk memilih</span>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="p-6 text-center text-stone-400 text-xs">
                  <User className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                  <p className="font-semibold text-stone-600">Member tidak ditemukan</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Tidak ada member dengan nama, no. HP &quot;{query}&quot;, atau nomor member tersebut.
                  </p>
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const mTier = safeTiers.find((t) => t.id === m.tierId) || safeTiers[0] || DEFAULT_TIER;
                  const isCurrent = m.id === selectedMemberId;
                  const tierColor = mTier?.colorHex || '#00A651';
                  const tierName = mTier?.name || 'Member';

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelect(m)}
                      className={`w-full text-left p-3 hover:bg-stone-50 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                        isCurrent ? 'bg-[#00A651]/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-serif text-xs font-bold text-white shadow-2xs shrink-0"
                          style={{ backgroundColor: tierColor }}
                        >
                          {(m.fullName || 'M').charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-stone-900">
                              {m.fullName || 'Tamu Hotel'}
                            </span>
                            <span
                              className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider"
                              style={{
                                backgroundColor: `${tierColor}20`,
                                color: tierColor,
                              }}
                            >
                              {tierName}
                            </span>
                          </div>

                          <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-[#00A651] font-bold">
                              {m.membershipNumber || '-'}
                            </span>
                            <span className="text-stone-300">·</span>
                            <span className="font-mono text-stone-600 flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 text-[#00A651]" />
                              {m.phone || '-'}
                            </span>
                            <span className="text-stone-300">·</span>
                            <span className="font-mono text-amber-700 font-semibold">
                              {(m.availablePoints || 0).toLocaleString('id-ID')} pts
                            </span>
                          </div>
                        </div>
                      </div>

                      {isCurrent && (
                        <div className="w-6 h-6 rounded-full bg-[#00A651] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {helperText && <p className="text-[11px] text-stone-400">{helperText}</p>}
    </div>
  );
};
