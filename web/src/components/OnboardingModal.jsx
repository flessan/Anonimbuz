import React, { useState, useEffect } from 'react';
import api from '../api';

export default function OnboardingModal({ user, onClose }) {
  const [step, setStep] = useState(1);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [followState, setFollowState] = useState({});
  const [busy, setBusy] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(true);

  const totalSteps = 5;

  useEffect(() => {
    async function fetchSuggestedUsers() {
      setLoadingUsers(true);
      try {
        const res = await api.get('/users/suggested', {
          params: { limit: 5 }
        });
        
        let users = res.data.users || [];
        
        // Double filter: exclude current user
        if (user) {
          users = users.filter(u => u.username !== user.username);
        }
        
        setSuggestedUsers(users);
        
        // Initialize states
        const initialState = {};
        const busyState = {};
        users.forEach(u => {
          initialState[u.username] = u.isFollowing || false;
          busyState[u.username] = false;
        });
        setFollowState(initialState);
        setBusy(busyState);
      } catch (e) {
        console.error('Gagal fetch suggested users:', e);
        setSuggestedUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }

    if (step === 4) {
      fetchSuggestedUsers();
    }
  }, [step, user]);

  async function handleFollow(username) {
    if (busy[username]) return;
    
    // Guard: Jangan follow diri sendiri
    if (user && user.username === username) {
      return;
    }
    
    setBusy((prev) => ({ ...prev, [username]: true }));
    
    try {
      const res = await api.post(`/users/${username}/follow`);
      const isNowFollowing = res.data.followed;
      
      setFollowState((prev) => ({ ...prev, [username]: isNowFollowing }));
      
      setSuggestedUsers(prev => 
        prev.map(u => 
          u.username === username 
            ? { ...u, isFollowing: isNowFollowing }
            : u
        )
      );
    } catch (e) {
      console.error(`Gagal mengikuti ${username}:`, e);
      const errorMsg = e.response?.data?.error || '';
      
      // Silent fail untuk follow diri sendiri
      if (errorMsg.includes('diri sendiri') || errorMsg.includes('yourself')) {
        return;
      }
    } finally {
      setBusy((prev) => ({ ...prev, [username]: false }));
    }
  }

  function handleNext() {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      localStorage.setItem('anonimbuz_onboarded', 'true');
      onClose();
    }
  }

  function handlePrev() {
    if (step > 1) {
      setStep(step - 1);
    }
  }

  function handleSkip() {
    localStorage.setItem('anonimbuz_onboarded', 'true');
    onClose();
  }

  function getInitial(name) {
    return (name || '?').charAt(0).toUpperCase();
  }

  function getRoleBadge(role) {
    switch (role) {
      case 'dev':
        return { label: 'DEV', color: 'var(--color-dev, #ff6b35)' };
      case 'mod':
        return { label: 'MOD', color: 'var(--color-accent, #a78bfa)' };
      default:
        return null;
    }
  }

  function getAvatarColor(role) {
    switch (role) {
      case 'dev': return 'var(--color-dev, #ff6b35)';
      case 'mod': return 'var(--color-accent, #a78bfa)';
      default: return 'var(--color-primary, #818cf8)';
    }
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        {step === 1 && (
          <>
            <div className="onboarding-icon">👋</div>
            <h2 className="onboarding-title">Selamat Datang di Anonimbuz!</h2>
            <p className="onboarding-desc">
              Lini masa sosial teks-first berdesain modern, cepat, dan sepenuhnya mengutamakan privasimu. Mari kenali beberapa fitur utama dalam 1 menit!
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <div className="onboarding-icon">🛡️</div>
            <h2 className="onboarding-title">Kendalikan Privasimu</h2>
            <p className="onboarding-desc">
              Kamu bisa membuat postingan publik yang terikat dengan nama profilmu, atau mencentang opsi <strong>"Posting secara anonim"</strong> untuk memposting menggunakan nama samaran (pseudonim) otomatis agar identitas aslimu tidak diketahui oleh orang lain.
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <div className="onboarding-icon">🔗</div>
            <h2 className="onboarding-title">Sistem Penyematan Cerdas</h2>
            <p className="onboarding-desc">
              Kami tidak mendukung unggahan gambar langsung demi privasi & performa. Sebagai gantinya, cukup tempelkan URL dari <strong>YouTube, Spotify, TikTok, Instagram, atau direct file .png/.jpg/.mp4</strong> ke kolom teks, sistem akan menyematkannya secara langsung!
            </p>
          </>
        )}

        {step === 4 && (
          <>
            <div className="onboarding-icon">👥</div>
            <h2 className="onboarding-title">Ikuti Kreator Terpopuler</h2>
            <p className="onboarding-desc">
              Ikuti akun resmi di bawah ini agar feed Beranda-mu langsung terisi dengan info penting serta diskusi seru terbaru:
            </p>
            
            {loadingUsers ? (
              <div className="onboarding-loading" style={{ padding: '16px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    marginBottom: '12px' 
                  }}>
                    <div style={{ 
                      width: 36, 
                      height: 36, 
                      borderRadius: '50%',
                      background: 'var(--color-surface-2)',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        width: '60%', 
                        height: '12px',
                        background: 'var(--color-surface-2)',
                        borderRadius: '4px',
                        marginBottom: '4px',
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }}></div>
                      <div style={{ 
                        width: '40%', 
                        height: '10px',
                        background: 'var(--color-surface-2)',
                        borderRadius: '4px',
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : suggestedUsers.length === 0 ? (
              <div className="onboarding-empty" style={{ 
                padding: '24px 16px', 
                textAlign: 'center',
                color: 'var(--color-text-secondary)',
                fontSize: '13px',
                background: 'var(--color-surface-2)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                <p style={{ margin: 0 }}>
                  Belum ada pengguna yang disarankan saat ini.
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.7 }}>
                  Kamu bisa cari teman dari halaman Jelajah.
                </p>
              </div>
            ) : (
              <div className="onboarding-suggestions" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                width: '100%',
                marginTop: '12px'
              }}>
                {suggestedUsers.map((suggestedUser) => {
                  const roleBadge = getRoleBadge(suggestedUser.role);
                  
                  return (
                    <div 
                      key={suggestedUser.username} 
                      className="onboarding-suggested-user"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'var(--color-surface-2)',
                        borderRadius: '10px',
                        border: '1px solid var(--color-border)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div className="onboarding-user-info" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px',
                        flex: 1,
                        minWidth: 0
                      }}>
                        {suggestedUser.avatarUrl ? (
                          <img 
                            src={suggestedUser.avatarUrl} 
                            alt={suggestedUser.username}
                            style={{ 
                              width: 36, 
                              height: 36, 
                              borderRadius: '50%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div 
                            style={{ 
                              width: 36, 
                              height: 36, 
                              borderRadius: '50%',
                              background: getAvatarColor(suggestedUser.role),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '14px',
                              flexShrink: 0
                            }}
                          >
                            {getInitial(suggestedUser.displayName || suggestedUser.username)}
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: 'bold', 
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexWrap: 'wrap'
                          }}>
                            {suggestedUser.displayName || suggestedUser.username}
                            {roleBadge && (
                              <span style={{ 
                                fontSize: '9px', 
                                background: roleBadge.color,
                                color: 'white',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: '700',
                                letterSpacing: '0.5px'
                              }}>
                                {roleBadge.label}
                              </span>
                            )}
                          </div>
                          <div style={{ 
                            fontSize: '11px', 
                            color: 'var(--color-text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            @{suggestedUser.username}
                            {suggestedUser.followersCount > 0 && (
                              <span> · {suggestedUser.followersCount} pengikut</span>
                            )}
                            {suggestedUser.postsCount > 0 && (
                              <span> · {suggestedUser.postsCount} post</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        className={`profile-btn ${followState[suggestedUser.username] ? '' : 'primary'}`}
                        style={{ 
                          padding: '6px 14px', 
                          fontSize: '12px',
                          marginLeft: '8px',
                          flexShrink: 0,
                          minWidth: '80px'
                        }}
                        onClick={() => handleFollow(suggestedUser.username)}
                        disabled={busy[suggestedUser.username] || followState[suggestedUser.username]}
                      >
                        {followState[suggestedUser.username] 
                          ? '✓ Mengikuti' 
                          : busy[suggestedUser.username] 
                            ? '...' 
                            : 'Ikuti'
                        }
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {step === 5 && (
          <>
            <div className="onboarding-icon">✨</div>
            <h2 className="onboarding-title">Mulai Petualanganmu!</h2>
            <p className="onboarding-desc">
              Semua persiapan telah selesai! Bagikan apa pun yang ada di kepalamu, diskusikan topik terhangat, dan nikmati interaksi bebas tanpa cemas.
            </p>
            <div className="card" style={{
              background: 'var(--color-accent-soft)',
              borderColor: 'var(--color-border-glow)',
              padding: '12px 16px',
              fontSize: '13px',
              color: 'var(--color-text-primary)',
              marginBottom: '24px',
              width: '100%',
              borderRadius: '8px'
            }}>
              💡 <strong>Ide Postingan Pertama:</strong> "Ada yang tahu cara menyematkan podcast Spotify favorit ke sini?"
            </div>
          </>
        )}

        {/* Step Indicator Dots */}
        <div className="onboarding-dots">
          {[...Array(totalSteps)].map((_, i) => (
            <div
              key={i}
              className={`onboarding-dot ${step === i + 1 ? 'active' : ''}`}
            ></div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="onboarding-actions">
          {step > 1 ? (
            <button className="profile-btn" onClick={handlePrev}>
              Kembali
            </button>
          ) : (
            <button className="profile-btn" onClick={handleSkip} style={{ opacity: 0.6 }}>
              Lewati
            </button>
          )}
          <button className="profile-btn primary" onClick={handleNext}>
            {step === totalSteps ? 'Mulai Sekarang' : 'Lanjut'}
          </button>
        </div>
      </div>
    </div>
  );
}