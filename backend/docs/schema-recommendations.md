# Rekomendasi Penyempurnaan Schema untuk Gloria System

## 1. Tambahkan Entitas Organization (YAYASAN)

```prisma
model Organization {
  id          String    @id
  code        String    @unique
  name        String
  type        String    // "YAYASAN", "FOUNDATION"
  address     String?
  phone       String?
  email       String?
  website     String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  schools     School[]
  departments Department[] // For YAYASAN-level departments

  @@map("organizations")
  @@schema("gloria_ops")
}
```

## 2. Update School Model

```prisma
model School {
  // ... existing fields ...
  organizationId  String?        @map("organization_id")
  schoolType      SchoolType     // PGTK, SD, SMP, SMA

  organization    Organization?  @relation(fields: [organizationId], references: [id])
  // ... rest of relations ...
}

enum SchoolType {
  PGTK  // Pendidikan Guru Taman Kanak-kanak
  SD    // Sekolah Dasar
  SMP   // Sekolah Menengah Pertama
  SMA   // Sekolah Menengah Atas

  @@schema("gloria_ops")
}
```

## 3. Tambahkan Location Entity

```prisma
model Location {
  id          String    @id
  code        String    @unique
  name        String
  address     String?
  city        String?
  province    String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  schools     School[]

  @@map("locations")
  @@schema("gloria_ops")
}
```

## 4. Tambahkan Employee Type Enum

```prisma
enum EmployeeType {
  GURU          // Teachers
  KARYAWAN      // Staff
  NON_PEGAWAI   // Non-permanent
  OUTSOURCING   // Outsourced staff

  @@schema("gloria_ops")
}
```

Update DataKaryawan:
```prisma
model DataKaryawan {
  // ... existing fields ...
  jenisKaryawan  EmployeeType?  @map("jenis_karyawan")
  // ... rest of fields ...
}
```

## 5. Tambahkan Department Type

```prisma
enum DepartmentType {
  ACADEMIC      // School units (PGTK, SD, etc)
  SUPPORT       // Support units (SATPAM, UMUM)
  ADMINISTRATIVE // Admin units (HR, Finance, etc)

  @@schema("gloria_ops")
}

model Department {
  // ... existing fields ...
  departmentType  DepartmentType  @default(ACADEMIC)
  // ... rest of fields ...
}
```

## 6. Position Templates

```prisma
model PositionTemplate {
  id              String   @id
  code            String   @unique
  name            String
  bidangKerja     String   // Maps to CSV bidang_kerja
  hierarchyLevel  Int
  employeeType    EmployeeType
  defaultPermissions Json
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("position_templates")
  @@schema("gloria_ops")
}
```

## 7. Multi-Assignment Enhancement

```prisma
model UserPosition {
  // ... existing fields ...
  assignmentType  AssignmentType  @default(PRIMARY)
  workPercentage  Int            @default(100)
  // ... rest of fields ...
}

enum AssignmentType {
  PRIMARY     // Main position
  SECONDARY   // Additional responsibility
  TEMPORARY   // Temporary assignment (PLT)

  @@schema("gloria_ops")
}
```

## Migration Strategy

### Phase 1: Schema Updates
1. Add new models and enums
2. Update existing models with new fields
3. Run Prisma migration

### Phase 2: Data Import
```javascript
// Import mapping example
const schoolMapping = {
  'PGTK1': { code: 'PGTK1', name: 'PGTK Pacar', lokasi: 'Pacar', type: 'PGTK' },
  'PGTK2': { code: 'PGTK2', name: 'PGTK Kupang Indah', lokasi: 'Kupang Indah', type: 'PGTK' },
  // ... etc
};

const positionMapping = {
  'KEPALA SEKOLAH': { hierarchyLevel: 1, template: 'PRINCIPAL' },
  'WAKIL KEPALA SEKOLAH': { hierarchyLevel: 2, template: 'VICE_PRINCIPAL' },
  'GURU': { hierarchyLevel: 3, template: 'TEACHER' },
  // ... etc
};
```

### Phase 3: Permission Setup
- Map employee types to default permission sets
- Create role templates for each position type
- Assign permissions based on bidang_kerja

## Expected Benefits

1. **Better Hierarchy**: Clear organization → school → department structure
2. **Data Integrity**: Enums prevent invalid data entry
3. **Scalability**: Easy to add new schools or locations
4. **Flexibility**: Support for multi-assignment and cross-school roles
5. **Standardization**: Position templates ensure consistency across schools