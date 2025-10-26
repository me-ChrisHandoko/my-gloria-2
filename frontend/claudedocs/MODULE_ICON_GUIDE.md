# Module Icon Guide

Panduan penggunaan icon untuk Module Management di sistem yayasan.

## 🎯 Icon Strategy

Sistem mendukung **2 jenis icon**:
1. **Emoji** (Recommended) - Mudah, colorful, universal
2. **Lucide React Icons** - Professional, scalable, consistent

## 📚 Emoji Icons (RECOMMENDED)

### Kelebihan
- ✅ Tidak perlu coding/import
- ✅ Copy-paste langsung ke form
- ✅ Colorful dan eye-catching
- ✅ Universal, terlihat di semua platform
- ✅ Mudah diupdate oleh non-developer

### Cara Penggunaan
Ketik atau copy-paste emoji langsung ke field "Icon" di form Create/Edit Module.

### Emoji Recommendations untuk Yayasan

#### Academic & Education
- 🎓 Graduation Cap - Academic, Ijazah
- 📚 Books - Perpustakaan, Kurikulum
- 📖 Open Book - Pembelajaran
- 📝 Memo - Ujian, Assessment
- 📊 Chart - Rapor, Nilai
- 🏫 School Building - Sekolah
- 👨‍🎓 Student - Siswa
- 👨‍🏫 Teacher - Guru
- 📅 Calendar - Jadwal
- ⏰ Clock - Waktu Belajar

#### HR & People Management
- 👥 People - Human Resources
- 👤 Person - Employee, Pegawai
- 📋 Clipboard - Kepegawaian
- ⏱️ Timer - Absensi, Kehadiran
- 💼 Briefcase - Karir
- 📊 Chart - Kinerja
- 🎯 Target - Performance
- 📈 Trending Up - Pengembangan
- 🏆 Trophy - Penghargaan
- 💪 Muscle - Training

#### Finance & Budget
- 💰 Money Bag - Keuangan
- 💵 Dollar - Kas
- 💳 Credit Card - Pembayaran
- 🧾 Receipt - Tagihan
- 📊 Chart - Budget
- 💹 Chart Up - Revenue
- 💸 Money Wings - Pengeluaran
- 🏦 Bank - Perbankan
- 📈 Trending - Investasi
- 💎 Gem - Aset

#### Operations & Service
- ⚙️ Gear - Settings, Konfigurasi
- 🔧 Wrench - Maintenance
- 📦 Package - Inventory
- 🏢 Office - Fasilitas
- 🚪 Door - Akses
- 🔐 Lock - Keamanan
- 🔑 Key - Izin
- 📱 Phone - Komunikasi
- 📧 Email - Surat
- 📞 Telephone - Kontak

#### Quality & Feedback
- ⭐ Star - Rating
- 👍 Thumbs Up - Approval
- ❤️ Heart - Kepuasan
- 📝 Memo - Feedback
- 🎯 Target - Quality
- ✅ Check - Validasi
- ⚡ Lightning - Cepat
- 🌟 Sparkle - Excellence
- 💡 Bulb - Ide
- 🔍 Magnifying Glass - Review

#### System & Admin
- 🛡️ Shield - Permissions, Roles
- 👑 Crown - Admin
- 🔒 Lock - Security
- 📊 Chart - Analytics
- 🗂️ File Cabinet - Archive
- 📁 Folder - Documents
- 🖥️ Computer - System
- 🌐 Globe - Network
- ⚡ Bolt - Performance
- 🔔 Bell - Notifications

## 🎨 Lucide React Icons

### Kelebihan
- ✅ Konsisten dengan design system
- ✅ Scalable (SVG-based)
- ✅ Customizable (color, size)
- ✅ Professional look

### Cara Penggunaan
Ketik **nama icon** (PascalCase) ke field "Icon". Contoh: `GraduationCap`, `Users`, `Wallet`

### Popular Lucide Icons untuk Yayasan

#### Academic
- `GraduationCap` - Academic
- `BookOpen` - Pembelajaran
- `Library` - Perpustakaan
- `Award` - Penghargaan
- `Calendar` - Jadwal
- `Clock` - Waktu
- `FileText` - Dokumen
- `ClipboardList` - Daftar

#### People
- `Users` - HR, Team
- `User` - Pegawai
- `UserCheck` - Absensi
- `UserCog` - Konfigurasi User
- `UserPlus` - Tambah User
- `Shield` - Permissions

#### Finance
- `Wallet` - Keuangan
- `DollarSign` - Uang
- `CreditCard` - Pembayaran
- `Receipt` - Tagihan
- `TrendingUp` - Revenue
- `TrendingDown` - Expense

#### Operations
- `Settings` - Pengaturan
- `Package` - Inventory
- `Building` - Fasilitas
- `Lock` - Keamanan
- `Key` - Akses
- `Mail` - Email
- `Phone` - Telepon

## 💡 Best Practices

### 1. **Konsistensi Dalam Domain**
Gunakan style yang sama untuk module dalam domain yang sama:
```
✅ GOOD:
HR Domain: 👥, 👤, 📋, ⏱️ (semua emoji)

❌ BAD:
HR Domain: 👥, Users, 📋, UserCheck (mix emoji & Lucide)
```

### 2. **Emoji untuk Parent, Lucide untuk Child (Optional)**
```
Parent:  👥 Human Resources (emoji - eye-catching)
  Child: Users Employee Management (Lucide - professional)
  Child: UserCheck Attendance (Lucide - consistent)
```

### 3. **Mudah Dikenali**
Pilih icon yang langsung mencerminkan fungsi module:
```
✅ 💰 Finance - Jelas
✅ 📚 Library - Jelas
❌ 🔥 Finance - Membingungkan
```

### 4. **Hindari Emoji Ambigu**
```
✅ 📊 Analytics - Specific
❌ 😊 Analytics - Terlalu generic
```

## 🔧 Implementation

### Smart Icon Component
Sistem otomatis mendeteksi jenis icon dan render sesuai:

```tsx
import ModuleIcon from '@/components/features/permissions/module/ModuleIcon';

// Usage
<ModuleIcon icon="📚" size={24} />  // Renders emoji
<ModuleIcon icon="GraduationCap" size={24} />  // Renders Lucide component
```

### Di Database
Simpan sebagai string di field `icon`:
```sql
INSERT INTO modules (code, name, icon) VALUES
  ('ACADEMIC', 'Academic', '🎓'),
  ('HR', 'Human Resources', '👥'),
  ('FINANCE', 'Finance', '💰');
```

## 📖 Quick Reference

### Domain Icons Cheatsheet

| Domain | Emoji | Lucide | Deskripsi |
|--------|-------|--------|-----------|
| Academic | 🎓 | GraduationCap | Akademik |
| HR | 👥 | Users | SDM |
| Finance | 💰 | Wallet | Keuangan |
| Library | 📚 | BookOpen | Perpustakaan |
| Quality | ⭐ | Star | Kualitas |
| Training | 💪 | Award | Pelatihan |
| System | ⚙️ | Settings | Sistem |
| Permissions | 🛡️ | Shield | Izin |
| Student | 👨‍🎓 | UserCheck | Siswa |
| Schedule | 📅 | Calendar | Jadwal |

## 🌐 Emoji Resources

### Emoji Picker Tools
- Windows: `Win + .` (titik)
- Mac: `Cmd + Ctrl + Space`
- Web: https://emojipedia.org
- Web: https://getemoji.com

### Lucide Icons Reference
- Website: https://lucide.dev/icons
- Search by category: Education, Finance, Users, etc.

## ⚠️ Catatan Penting

1. **Emoji di Database**: Pastikan database charset UTF8MB4 untuk support emoji
2. **Browser Support**: Emoji appearance berbeda per OS/browser
3. **Accessibility**: Lucide icons better untuk screen readers
4. **Performance**: Emoji lebih ringan (just text) vs Lucide (SVG components)

---

**Rekomendasi untuk Yayasan**: Gunakan **emoji** untuk kemudahan dan visual appeal! 🎯
