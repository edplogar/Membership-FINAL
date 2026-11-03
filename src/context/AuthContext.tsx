import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Member, UserRoleType, PermissionCode, Role } from '../types';
import {
  INITIAL_USERS,
  INITIAL_ROLES,
  INITIAL_MEMBERS,
  loadFromStorage,
  saveToStorage,
} from '../services/storage';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, cleanFirestoreData } from '../services/firebase';

interface AuthContextValue {
  currentUser: User | null;
  currentMember: Member | null;
  userRole: UserRoleType | null;
  roles: Role[];
  isAuthenticated: boolean;
  hasPermission: (permission: PermissionCode) => boolean;
  login: (identifier: string, password?: string) => boolean;
  loginWithGoogle: (
    googleEmail: string,
    displayName?: string,
    photoURL?: string,
    selectedRole?: UserRoleType
  ) => boolean;
  logout: () => void;
  switchDemoRole: (userIdOrRole: string) => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  updateUserProfile: (updates: {
    name: string;
    username?: string;
    email: string;
    phone?: string;
    avatar?: string;
    department?: string;
    jobTitle?: string;
    password?: string;
    address?: string;
    city?: string;
    birthDate?: string;
    gender?: 'L' | 'P' | 'OTHER';
  }) => void;
  updateAdministrator: (userId: string, updates: Partial<User>) => void;
  updateRolePermissions: (roleId: string, permissions: PermissionCode[]) => void;
  refreshMemberData: (member: Member) => void;
  findAccountByIdentifier: (identifier: string) => {
    email: string;
    name: string;
    username?: string;
    avatar?: string;
    phone?: string;
    membershipNumber?: string;
  } | null;
  resetPasswordWithRecovery: (emailOrUsername: string, newPassword: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(() =>
    loadFromStorage<User[]>('users', INITIAL_USERS)
  );
  const [roles, setRoles] = useState<Role[]>(() =>
    loadFromStorage<Role[]>('roles', INITIAL_ROLES)
  );
  const [members, setMembers] = useState<Member[]>(() =>
    loadFromStorage<Member[]>('members', INITIAL_MEMBERS)
  );

  // Active user session (null when logged out, so LoginPage is the default entry point for all visitors)
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return loadFromStorage<string | null>('auth_current_user_id', null);
  });

  const currentUser = currentUserId ? users.find((u) => u.id === currentUserId) || null : null;
  const userRole = currentUser?.role || null;
  const isAuthenticated = Boolean(currentUser);

  // If user is a member, get member details
  const currentMember =
    userRole === 'MEMBER' && currentUser?.memberId
      ? members.find((m) => m.id === currentUser.memberId) || members[0]
      : null;

  useEffect(() => {
    if (currentUserId) {
      saveToStorage('auth_current_user_id', currentUserId);
    } else {
      localStorage.removeItem('lgh_membership_auth_current_user_id');
    }
  }, [currentUserId]);

  // Real-time Firestore Listeners to guarantee instant sync across subdomain and devices
  useEffect(() => {
    let unsubUsers: (() => void) | undefined;
    let unsubMembers: (() => void) | undefined;
    let unsubRoles: (() => void) | undefined;

    try {
      unsubUsers = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: User[] = [];
            snapshot.forEach((docSnap) => {
              const u = docSnap.data() as User;
              if (u && u.id) list.push(u);
            });
            setUsers(list);
            saveToStorage('users', list);
          }
        },
        (error) => {
          console.warn('[AUTH FIREBASE] users onSnapshot notice:', error);
        }
      );

      unsubMembers = onSnapshot(
        collection(db, 'members'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Member[] = [];
            snapshot.forEach((docSnap) => {
              const m = docSnap.data() as Member;
              if (m && m.id) list.push(m);
            });
            setMembers(list);
            saveToStorage('members', list);
          }
        },
        (error) => {
          console.warn('[AUTH FIREBASE] members onSnapshot notice:', error);
        }
      );

      unsubRoles = onSnapshot(
        collection(db, 'roles'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Role[] = [];
            snapshot.forEach((docSnap) => {
              const r = docSnap.data() as Role;
              if (r && r.id) list.push(r);
            });
            setRoles(list);
            saveToStorage('roles', list);
          }
        },
        (error) => {
          console.warn('[AUTH FIREBASE] roles onSnapshot notice:', error);
        }
      );
    } catch (e) {
      console.warn('[AUTH FIREBASE] Setup snapshot listener notice:', e);
    }

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubMembers) unsubMembers();
      if (unsubRoles) unsubRoles();
    };
  }, []);

  const hasPermission = (permission: PermissionCode): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true; // Super admin has universal permissions

    const roleObj = roles.find((r) => r.id === currentUser.roleId || r.code === currentUser.role);
    if (!roleObj) return false;
    return roleObj.permissions.includes(permission);
  };

  const login = (identifier: string, password?: string): boolean => {
    const cleanId = identifier.toLowerCase().trim();

    // 1. Search in users table by email OR username
    const foundUser = users.find(
      (u) =>
        u.email.toLowerCase().trim() === cleanId ||
        (u.username && u.username.toLowerCase().trim() === cleanId) ||
        (cleanId === 'superadmin' && u.role === 'SUPER_ADMIN') ||
        (cleanId === 'admin' && u.role === 'ADMIN') ||
        (cleanId === 'operator_fo' && (u.role === 'OPERATOR_FO' || u.roleId === 'role_operator_fo')) ||
        (cleanId === 'operator_fb' && (u.role === 'OPERATOR_FB' || u.roleId === 'role_operator_fb')) ||
        (cleanId === 'fo' && u.role === 'OPERATOR_FO') ||
        (cleanId === 'fb' && u.role === 'OPERATOR_FB')
    );

    if (foundUser) {
      if (!foundUser.isActive) return false;
      // If user has a set password and a password was entered, verify it
      if (password && foundUser.password && foundUser.password.trim() !== password.trim()) {
        return false;
      }
      const updatedUser: User = {
        ...foundUser,
        username: foundUser.username || (foundUser.role === 'SUPER_ADMIN' ? 'superadmin' : foundUser.role === 'ADMIN' ? 'admin' : foundUser.email.split('@')[0]),
        lastLogin: new Date().toISOString(),
      };
      const updatedList = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      setUsers(updatedList);
      saveToStorage('users', updatedList);
      try {
        setDoc(doc(db, 'users', foundUser.id), cleanFirestoreData(updatedUser), { merge: true }).catch(() => {});
      } catch {}
      setCurrentUserId(foundUser.id);
      return true;
    }

    // 2. Check in members table by email OR username
    const foundMember = members.find(
      (m) =>
        m.email.toLowerCase().trim() === cleanId ||
        (m.username && m.username.toLowerCase().trim() === cleanId) ||
        m.nickname.toLowerCase().trim() === cleanId
    );

    if (foundMember) {
      if (foundMember.status === 'SUSPENDED' || foundMember.status === 'INACTIVE') {
        return false;
      }
      if (password && foundMember.password && foundMember.password.trim() !== password.trim()) {
        return false;
      }

      const generatedUsername = foundMember.username || foundMember.email.split('@')[0];
      const newMemberUser: User = {
        id: `usr_${foundMember.id}`,
        email: foundMember.email,
        username: generatedUsername,
        name: foundMember.fullName,
        role: 'MEMBER',
        roleId: 'role_member',
        memberId: foundMember.id,
        phone: foundMember.phone,
        avatar: foundMember.avatar,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      const updated = [...users.filter((u) => u.id !== newMemberUser.id), newMemberUser];
      setUsers(updated);
      saveToStorage('users', updated);
      setCurrentUserId(newMemberUser.id);
      return true;
    }

    return false;
  };

  const loginWithGoogle = (
    googleEmail: string,
    displayName?: string,
    photoURL?: string,
    selectedRole?: UserRoleType
  ): boolean => {
    const cleanEmail = googleEmail.toLowerCase().trim();

    // 1. Check if user is edp.logar@gmail.com (Super Admin) or existing in users table
    if (cleanEmail === 'edp.logar@gmail.com' || cleanEmail === 'superadmin@lombokgardenhotel.com') {
      let superUser = users.find((u) => u.email.toLowerCase().trim() === cleanEmail);
      if (!superUser) {
        superUser = {
          id: 'usr_superadmin_edp',
          username: 'edp.logar',
          email: 'edp.logar@gmail.com',
          name: displayName || 'EDP Logar (Super Administrator)',
          role: 'SUPER_ADMIN',
          roleId: 'role_super_admin',
          department: 'Executive Management & IT',
          jobTitle: 'Super Administrator & System Owner',
          password: 'admin123',
          avatar: photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
          phone: '+62 811-390-001',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        const updatedUsers = [superUser, ...users];
        setUsers(updatedUsers);
        saveToStorage('users', updatedUsers);
      }
      setCurrentUserId(superUser.id);
      return true;
    }

    // 2. Check existing users table (staff / super admin / existing member user)
    const existingUser = users.find((u) => u.email.toLowerCase().trim() === cleanEmail);
    if (existingUser) {
      if (!existingUser.isActive) return false;
      if (photoURL && !existingUser.avatar) {
        existingUser.avatar = photoURL;
      }
      if (selectedRole && existingUser.role !== selectedRole && selectedRole !== 'SUPER_ADMIN') {
        existingUser.role = selectedRole;
      }
      setCurrentUserId(existingUser.id);
      return true;
    }

    // 3. Check existing members table
    const existingMember = members.find((m) => m.email.toLowerCase().trim() === cleanEmail);
    if (existingMember) {
      const newMemberUser: User = {
        id: `usr_${existingMember.id}`,
        email: existingMember.email,
        name: displayName || existingMember.fullName,
        role: selectedRole || 'MEMBER',
        roleId: selectedRole === 'ADMIN' ? 'role_hotel_admin' : 'role_member',
        memberId: existingMember.id,
        avatar: photoURL,
        phone: existingMember.phone,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      const updated = [...users, newMemberUser];
      setUsers(updated);
      saveToStorage('users', updated);
      setCurrentUserId(newMemberUser.id);
      return true;
    }

    // 4. New Google User -> Register as new Member & User (or Admin if selected)
    const targetRole: UserRoleType = selectedRole || 'MEMBER';
    const newMemberId = `mem_g_${Date.now()}`;
    const membershipNumber = `LGH-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 24 * 30 * 86400000).toISOString().slice(0, 10);

    const newMember: Member = {
      id: newMemberId,
      membershipNumber,
      fullName: displayName || cleanEmail.split('@')[0],
      nickname: (displayName || cleanEmail.split('@')[0]).split(' ')[0],
      email: cleanEmail,
      phone: '+62 812-Google-User',
      gender: 'L',
      birthDate: '1995-01-01',
      address: 'Mataram, Lombok',
      city: 'Mataram',
      province: 'Nusa Tenggara Barat',
      country: 'Indonesia',
      idCardNumber: '5201GoogleVerified',
      tierId: 'tier_member',
      registrationDate: now,
      membershipStartDate: now,
      membershipEndDate: end,
      referralCode: `${(displayName || 'LGH').slice(0, 4).toUpperCase()}-GOOG`,
      status: 'ACTIVE',
      totalVisits: 0,
      totalTransactions: 0,
      totalSpending: 0,
      totalPointsEarned: 100, // Welcome points
      availablePoints: 100,
      redeemedPoints: 0,
      internalNotes: 'Pendaftaran otomatis melalui Verifikasi Akun Google.',
    };

    const updatedMembers = [newMember, ...members];
    setMembers(updatedMembers);
    saveToStorage('members', updatedMembers);

    const newGoogleUser: User = {
      id: `usr_${newMemberId}`,
      email: cleanEmail,
      name: displayName || cleanEmail.split('@')[0],
      role: targetRole,
      roleId: targetRole === 'SUPER_ADMIN' ? 'role_super_admin' : targetRole === 'ADMIN' ? 'role_hotel_admin' : 'role_member',
      memberId: targetRole === 'MEMBER' ? newMemberId : undefined,
      avatar: photoURL,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [...users, newGoogleUser];
    setUsers(updatedUsers);
    saveToStorage('users', updatedUsers);
    setCurrentUserId(newGoogleUser.id);
    return true;
  };

  const logout = () => {
    setCurrentUserId(null);
  };

  const switchDemoRole = (targetIdOrRole: string) => {
    // Check if target is a known user ID
    const targetUser = users.find((u) => u.id === targetIdOrRole);
    if (targetUser) {
      setCurrentUserId(targetUser.id);
      return;
    }

    // Check if target is a role identifier
    if (targetIdOrRole === 'SUPER_ADMIN') {
      setCurrentUserId('usr_superadmin');
      return;
    }
    if (targetIdOrRole === 'ADMIN') {
      setCurrentUserId('usr_admin');
      return;
    }
    if (targetIdOrRole === 'OPERATOR_FO') {
      setCurrentUserId('usr_operator_fo');
      return;
    }
    if (targetIdOrRole === 'OPERATOR_FB') {
      setCurrentUserId('usr_operator_fb');
      return;
    }
    if (targetIdOrRole === 'MEMBER') {
      setCurrentUserId('usr_member_john');
      return;
    }

    // Check if target is a member ID directly
    const memberTarget = members.find((m) => m.id === targetIdOrRole);
    if (memberTarget) {
      // Find or create user for this member
      let memUser = users.find((u) => u.memberId === memberTarget.id);
      if (!memUser) {
        memUser = {
          id: `usr_${memberTarget.id}`,
          email: memberTarget.email,
          name: memberTarget.fullName,
          role: 'MEMBER',
          roleId: 'role_member',
          memberId: memberTarget.id,
          phone: memberTarget.phone,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        const updated = [...users, memUser];
        setUsers(updated);
        saveToStorage('users', updated);
      }
      setCurrentUserId(memUser.id);
    }
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser: User = { ...currentUser, ...updates };
    const updated = users.map((u) =>
      u.id === currentUser.id ? updatedUser : u
    );
    setUsers(updated);
    saveToStorage('users', updated);

    try {
      setDoc(doc(db, 'users', currentUser.id), cleanFirestoreData(updatedUser), { merge: true }).catch((err) => {
        console.warn('[AUTH FIREBASE] Failed to sync current user update:', err);
      });
    } catch {}
  };

  const updateUserProfile = (updates: {
    name: string;
    username?: string;
    email: string;
    phone?: string;
    avatar?: string;
    department?: string;
    jobTitle?: string;
    password?: string;
    address?: string;
    city?: string;
    birthDate?: string;
    gender?: 'L' | 'P' | 'OTHER';
  }) => {
    if (!currentUser) return;

    // 1. Update user record
    const userUpdates: Partial<User> = {
      name: updates.name,
      username: updates.username ? updates.username.toLowerCase().trim() : currentUser.username,
      email: updates.email.trim(),
      phone: updates.phone,
      avatar: updates.avatar,
      department: updates.department,
      jobTitle: updates.jobTitle,
      password: updates.password || currentUser.password,
    };

    const updatedUser: User = { ...currentUser, ...userUpdates };
    const updatedUsers = users.map((u) =>
      u.id === currentUser.id ? updatedUser : u
    );
    setUsers(updatedUsers);
    saveToStorage('users', updatedUsers);

    try {
      setDoc(doc(db, 'users', currentUser.id), cleanFirestoreData(updatedUser), { merge: true }).catch((err) => {
        console.warn('[AUTH FIREBASE] Failed to sync user profile:', err);
      });
    } catch {}

    // 2. If user is tied to a member account, also update the member table
    if (currentUser.memberId) {
      const memberId = currentUser.memberId;
      let updatedMember: Member | null = null;
      const updatedMembers = members.map((m) => {
        if (m.id === memberId) {
          updatedMember = {
            ...m,
            fullName: updates.name,
            nickname: updates.name.split(' ')[0],
            username: updates.username ? updates.username.toLowerCase().trim() : m.username,
            email: updates.email.trim(),
            phone: updates.phone || m.phone,
            avatar: updates.avatar || m.avatar,
            password: updates.password || m.password,
            address: updates.address !== undefined ? updates.address : m.address,
            city: updates.city !== undefined ? updates.city : m.city,
            birthDate: updates.birthDate !== undefined ? updates.birthDate : m.birthDate,
            gender: updates.gender !== undefined ? updates.gender : m.gender,
          };
          return updatedMember;
        }
        return m;
      });
      setMembers(updatedMembers);
      saveToStorage('members', updatedMembers);

      if (updatedMember) {
        try {
          setDoc(doc(db, 'members', memberId), cleanFirestoreData(updatedMember), { merge: true }).catch((err) => {
            console.warn('[AUTH FIREBASE] Failed to sync member profile:', err);
          });
        } catch {}
      }
    }
  };

  const updateAdministrator = (userId: string, updates: Partial<User>) => {
    let targetUpdated: User | null = null;
    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        let finalRoleId = updates.roleId || u.roleId;
        let finalRole = updates.role || u.role;

        // Ensure role and roleId are strictly aligned
        if (updates.roleId && !updates.role) {
          const matched = roles.find((r) => r.id === updates.roleId);
          if (matched) finalRole = matched.code as UserRoleType;
        } else if (updates.role && !updates.roleId) {
          const matched = roles.find((r) => r.code === updates.role);
          if (matched) finalRoleId = matched.id;
        }

        targetUpdated = {
          ...u,
          ...updates,
          role: finalRole,
          roleId: finalRoleId,
          username: updates.username ? updates.username.toLowerCase().trim() : u.username,
        };
        return targetUpdated;
      }
      return u;
    });
    setUsers(updatedUsers);
    saveToStorage('users', updatedUsers);

    if (targetUpdated) {
      try {
        setDoc(doc(db, 'users', userId), cleanFirestoreData(targetUpdated), { merge: true }).catch((err) => {
          console.warn('[AUTH FIREBASE] Failed to sync administrator:', err);
        });
      } catch {}
    }

    // Dispatch event so active sessions immediately recalculate RBAC
    window.dispatchEvent(new CustomEvent('rbac_user_updated', { detail: { userId, updates: targetUpdated } }));
  };

  const updateRolePermissions = (roleId: string, permissions: PermissionCode[]) => {
    let updatedTargetRole: Role | null = null;
    const updatedRoles = roles.map((r) => {
      if (r.id === roleId || r.code === roleId) {
        updatedTargetRole = { ...r, permissions };
        return updatedTargetRole;
      }
      return r;
    });

    setRoles(updatedRoles);
    saveToStorage('roles', updatedRoles);

    if (updatedTargetRole) {
      try {
        setDoc(doc(db, 'roles', (updatedTargetRole as Role).id), cleanFirestoreData(updatedTargetRole), { merge: true }).catch((err) => {
          console.warn('[AUTH FIREBASE] Failed to sync updated role:', err);
        });
      } catch {}
    }

    // Trigger local window event for real-time response
    window.dispatchEvent(new CustomEvent('rbac_permissions_updated', { detail: { roleId, permissions } }));
  };

  const refreshMemberData = (updatedMember: Member) => {
    const updatedList = members.map((m) =>
      m.id === updatedMember.id ? updatedMember : m
    );
    setMembers(updatedList);
    saveToStorage('members', updatedList);
  };

  const findAccountByIdentifier = (
    identifier: string
  ): {
    email: string;
    name: string;
    username?: string;
    avatar?: string;
    phone?: string;
    membershipNumber?: string;
  } | null => {
    const clean = identifier.toLowerCase().trim();
    if (!clean) return null;
    const digitsOnly = clean.replace(/[^0-9]/g, '');

    // 1. Check in users table
    const matchedUser = users.find((u) => {
      const uEmail = u.email.toLowerCase().trim();
      const uUsername = (u.username || '').toLowerCase().trim();
      const uPhoneDigits = (u.phone || '').replace(/[^0-9]/g, '');

      return (
        uEmail === clean ||
        uUsername === clean ||
        (clean === 'superadmin' && u.role === 'SUPER_ADMIN') ||
        (clean === 'admin' && u.role === 'ADMIN') ||
        (digitsOnly.length >= 6 && uPhoneDigits.endsWith(digitsOnly.slice(-8)))
      );
    });

    if (matchedUser) {
      return {
        email: matchedUser.email,
        name: matchedUser.name,
        username: matchedUser.username,
        avatar: matchedUser.avatar,
        phone: matchedUser.phone,
      };
    }

    // 2. Check in members table
    const matchedMember = members.find((m) => {
      const mEmail = m.email.toLowerCase().trim();
      const mUsername = (m.username || '').toLowerCase().trim();
      const mNickname = (m.nickname || '').toLowerCase().trim();
      const mFullName = m.fullName.toLowerCase().trim();
      const mNumber = m.membershipNumber.toLowerCase().trim();
      const mNumberClean = mNumber.replace(/[^a-z0-9]/gi, '');
      const mPhoneDigits = m.phone.replace(/[^0-9]/g, '');

      return (
        mEmail === clean ||
        mUsername === clean ||
        mNickname === clean ||
        mFullName === clean ||
        mNumber === clean ||
        mNumberClean === clean.replace(/[^a-z0-9]/gi, '') ||
        (digitsOnly.length >= 6 && mPhoneDigits.endsWith(digitsOnly.slice(-8)))
      );
    });

    if (matchedMember) {
      return {
        email: matchedMember.email,
        name: matchedMember.fullName,
        username: matchedMember.username || matchedMember.nickname,
        avatar: matchedMember.avatar,
        phone: matchedMember.phone,
        membershipNumber: matchedMember.membershipNumber,
      };
    }

    // If identifier looks like an email format, return structured fallback
    if (clean.includes('@') && clean.includes('.')) {
      return {
        email: clean,
        name: clean.split('@')[0],
      };
    }

    return null;
  };

  const resetPasswordWithRecovery = (emailOrUsername: string, newPassword: string): boolean => {
    const clean = emailOrUsername.toLowerCase().trim();
    if (!clean || !newPassword || newPassword.length < 6) return false;

    let matched = false;

    // 1. Update in users
    const updatedUsers = users.map((u) => {
      const match =
        u.email.toLowerCase().trim() === clean ||
        (u.username && u.username.toLowerCase().trim() === clean) ||
        (clean === 'superadmin' && u.role === 'SUPER_ADMIN') ||
        (clean === 'admin' && u.role === 'ADMIN');

      if (match) {
        matched = true;
        return {
          ...u,
          password: newPassword.trim(),
        };
      }
      return u;
    });

    if (matched) {
      setUsers(updatedUsers);
      saveToStorage('users', updatedUsers);
      const matchedUser = updatedUsers.find((u) =>
        u.email.toLowerCase().trim() === clean ||
        (u.username && u.username.toLowerCase().trim() === clean) ||
        (clean === 'superadmin' && u.role === 'SUPER_ADMIN') ||
        (clean === 'admin' && u.role === 'ADMIN')
      );
      if (matchedUser) {
        try {
          setDoc(doc(db, 'users', matchedUser.id), cleanFirestoreData(matchedUser), { merge: true }).catch(() => {});
        } catch {}
      }
    }

    // 2. Update in members
    let memberMatched = false;
    const updatedMembers = members.map((m) => {
      const match =
        m.email.toLowerCase().trim() === clean ||
        (m.username && m.username.toLowerCase().trim() === clean) ||
        m.nickname.toLowerCase().trim() === clean;

      if (match) {
        memberMatched = true;
        return {
          ...m,
          password: newPassword.trim(),
        };
      }
      return m;
    });

    if (memberMatched) {
      setMembers(updatedMembers);
      saveToStorage('members', updatedMembers);
      matched = true;
      const matchedMem = updatedMembers.find((m) =>
        m.email.toLowerCase().trim() === clean ||
        (m.username && m.username.toLowerCase().trim() === clean) ||
        m.nickname.toLowerCase().trim() === clean
      );
      if (matchedMem) {
        try {
          setDoc(doc(db, 'members', matchedMem.id), cleanFirestoreData(matchedMem), { merge: true }).catch(() => {});
        } catch {}
      }
    }

    return matched;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentMember,
        userRole,
        roles,
        isAuthenticated,
        hasPermission,
        login,
        loginWithGoogle,
        logout,
        switchDemoRole,
        updateCurrentUser,
        updateUserProfile,
        updateAdministrator,
        updateRolePermissions,
        refreshMemberData,
        findAccountByIdentifier,
        resetPasswordWithRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
