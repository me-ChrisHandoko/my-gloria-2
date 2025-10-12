# Testing Guide: Foundation-Level Departments

## Overview
Comprehensive testing guide untuk fitur foundation-level departments yang telah diimplementasikan pada frontend.

## Test Environment Setup

### Prerequisites
- [ ] Backend dengan schoolId nullable telah di-deploy
- [ ] Sample foundation departments telah dibuat (HR, Finance, IT)
- [ ] Multiple schools dengan departments tersedia
- [ ] Test user dengan permission untuk create/edit departments

### Test Data Preparation

```sql
-- Sample foundation departments
INSERT INTO departments (id, name, code, schoolId, organizationId, isActive) VALUES
  (UUID(), 'Human Resources', 'HR', NULL, 'org-123', true),
  (UUID(), 'Finance Department', 'FIN', NULL, 'org-123', true),
  (UUID(), 'IT Support', 'IT', NULL, 'org-123', true);

-- Sample school departments for School A
INSERT INTO departments (id, name, code, schoolId, organizationId, parentId, isActive) VALUES
  (UUID(), 'Mathematics Dept', 'MATH', 'school-a-id', 'org-123', NULL, true),
  (UUID(), 'Science Dept', 'SCI', 'school-a-id', 'org-123', NULL, true);

-- Sample school departments for School B
INSERT INTO departments (id, name, code, schoolId, organizationId, parentId, isActive) VALUES
  (UUID(), 'English Dept', 'ENG', 'school-b-id', 'org-123', NULL, true),
  (UUID(), 'History Dept', 'HIST', 'school-b-id', 'org-123', NULL, true);
```

## Frontend Testing Checklist

### 1. CreateDepartmentModal - UI & UX Tests

#### Test 1.1: Modal Opening & Data Loading
**Steps**:
1. Navigate to Departments page
2. Click "Create Department" button
3. Observe modal opening and data loading

**Expected Results**:
- ✅ Modal opens successfully
- ✅ Schools dropdown loads all schools
- ✅ Department codes dropdown loads available codes
- ✅ Parent department dropdown shows "Loading departments..."
- ✅ After loading, parent dropdown shows all departments (foundation + schools)
- ✅ All departments load immediately (not conditional on school selection)

**Evidence**: Loading spinner → Data displayed

---

#### Test 1.2: Foundation-Level Department Creation
**Steps**:
1. Open Create Department modal
2. Fill in:
   - Name: "Operations Department"
   - Code: "OPS"
   - School: Select "None"
   - Parent: Select "None" or any foundation parent
   - Description: "Foundation-wide operations"
   - Active: true
3. Click "Create Department"

**Expected Results**:
- ✅ Form submits successfully
- ✅ Success toast appears
- ✅ Modal closes
- ✅ New department appears in list with no school affiliation
- ✅ Backend receives `schoolId: null` or `schoolId: undefined`

**API Request Verification**:
```json
{
  "name": "Operations Department",
  "code": "OPS",
  "schoolId": null,
  "parentId": null,
  "description": "Foundation-wide operations",
  "isActive": true
}
```

---

#### Test 1.3: School-Specific Department Creation
**Steps**:
1. Open Create Department modal
2. Fill in:
   - Name: "Physics Department"
   - Code: "PHYS"
   - School: Select "School A"
   - Parent: Select foundation parent or School A parent
   - Description: "Physics for School A"
3. Click "Create Department"

**Expected Results**:
- ✅ Form submits successfully
- ✅ Department created under School A
- ✅ Parent dropdown shows foundation + School A departments only

---

#### Test 1.4: Parent Department Grouping
**Steps**:
1. Open Create Department modal
2. Wait for departments to load
3. Open Parent Department dropdown
4. Observe grouping and visual indicators

**Expected Results**:
- ✅ Departments grouped by: "Foundation Level" + "School A" + "School B" + ...
- ✅ Foundation departments show blue Building2 icon
- ✅ School departments show gray FolderTree icon
- ✅ Foundation departments show "• Foundation Level" label
- ✅ School departments show "• [School Name]" label
- ✅ Search works across all groups

**Visual Verification**:
```
None
─────────────────
Foundation Level
  🏢 Human Resources
     HR • Foundation Level
  🏢 Finance Department
     FIN • Foundation Level
  🏢 IT Support
     IT • Foundation Level
─────────────────
School A
  📁 Mathematics Dept
     MATH • School A
  📁 Science Dept
     SCI • School A
─────────────────
School B
  📁 English Dept
     ENG • School B
```

---

#### Test 1.5: Cross-School Parent Validation - Warning
**Steps**:
1. Open Create Department modal
2. Fill in:
   - School: Select "School A"
   - Parent: Select department from "School B"
3. Observe validation

**Expected Results**:
- ✅ Warning toast appears immediately after parent selection
- ✅ Warning message: "Warning: Parent department belongs to a different school..."
- ✅ Toast duration: 5000ms
- ✅ Form NOT blocked (warning only, not error)

---

#### Test 1.6: Cross-School Parent Validation - Error on Submit
**Steps**:
1. Open Create Department modal
2. Fill in:
   - Name: "Test Dept"
   - Code: "TEST"
   - School: Select "School A"
   - Parent: Select department from "School B"
3. Click "Create Department"

**Expected Results**:
- ✅ Form submission blocked
- ✅ Error toast appears
- ✅ Error message: "Cannot select parent from different school..."
- ✅ Modal remains open
- ✅ API request NOT sent

---

#### Test 1.7: Foundation Parent for School Department (Valid)
**Steps**:
1. Open Create Department modal
2. Fill in:
   - Name: "Biology Department"
   - Code: "BIO"
   - School: Select "School A"
   - Parent: Select "Human Resources" (foundation)
3. Click "Create Department"

**Expected Results**:
- ✅ No warning or error
- ✅ Form submits successfully
- ✅ Department created with foundation parent
- ✅ Hierarchy displayed correctly in UI

---

#### Test 1.8: Parent Dropdown Independence from School Selection
**Steps**:
1. Open Create Department modal
2. Observe parent dropdown initial state
3. Do NOT select any school
4. Click on parent dropdown

**Expected Results**:
- ✅ Parent dropdown is enabled (not disabled)
- ✅ Placeholder: "Select parent department" (not "Select school first")
- ✅ All departments visible (foundation + all schools)
- ✅ No dependency on school selection

---

### 2. EditDepartmentModal - UI & UX Tests

#### Test 2.1: Edit Foundation Department
**Steps**:
1. Navigate to Departments page
2. Click edit on foundation department (e.g., "Human Resources")
3. Observe modal content

**Expected Results**:
- ✅ Modal opens with department data pre-filled
- ✅ Dialog description: "Update department information (Foundation Level)"
- ✅ School field shows: "Foundation Level (No School)"
- ✅ School field is disabled
- ✅ Help text: "This is a foundation-level department"
- ✅ Parent dropdown shows all departments
- ✅ Can change name, code, parent, description, status

---

#### Test 2.2: Edit School Department
**Steps**:
1. Click edit on school department (e.g., "Mathematics Dept" from School A)
2. Observe modal content

**Expected Results**:
- ✅ Modal opens with department data
- ✅ Dialog description: "Update department information for School A"
- ✅ School field shows: "School A (SCH-A)"
- ✅ School field is disabled
- ✅ Help text: "School cannot be changed after creation"
- ✅ Parent dropdown filtered: Foundation + School A only
- ✅ School B departments NOT visible in parent dropdown

---

#### Test 2.3: Change Parent to Foundation (Valid)
**Steps**:
1. Edit school department (School A)
2. Current parent: Another School A department
3. Change parent to: Foundation department (e.g., "HR")
4. Click "Save Changes"

**Expected Results**:
- ✅ No validation error
- ✅ Update succeeds
- ✅ Success toast appears
- ✅ Modal closes
- ✅ Updated hierarchy reflected in list

---

#### Test 2.4: Circular Reference Prevention
**Steps**:
1. Edit department "A" which is parent of "B"
2. Try to select "B" as parent
3. Observe parent dropdown options

**Expected Results**:
- ✅ Department "B" (child) NOT in parent dropdown
- ✅ Self ("A") NOT in parent dropdown
- ✅ Only valid parent options shown
- ✅ Prevents circular dependencies

---

### 3. Integration Tests

#### Test 3.1: Department List Display
**Steps**:
1. Navigate to Departments page
2. Observe department list/table

**Expected Results**:
- ✅ Foundation departments show "Foundation Level" or "-" in School column
- ✅ School departments show school name in School column
- ✅ Visual distinction between foundation and school departments
- ✅ Filter by school works correctly
- ✅ "All Schools" filter includes foundation departments

---

#### Test 3.2: Department Hierarchy View
**Steps**:
1. View department hierarchy (if tree view available)
2. Observe parent-child relationships

**Expected Results**:
- ✅ Foundation departments at root level
- ✅ School departments under foundation parents (if applicable)
- ✅ School departments grouped under schools
- ✅ Hierarchy visually clear and correct

---

#### Test 3.3: Search & Filter
**Steps**:
1. Search for foundation department by name
2. Search for school department by name
3. Filter by school
4. Filter by "No School" or Foundation level

**Expected Results**:
- ✅ Search finds both foundation and school departments
- ✅ Filter by school excludes foundation departments
- ✅ Filter by foundation shows only foundation departments
- ✅ Combined filters work correctly

---

### 4. Data Integrity Tests

#### Test 4.1: Duplicate Code Validation
**Steps**:
1. Create foundation department with code "TEST"
2. Create another foundation department with code "TEST"

**Expected Results**:
- ✅ Second creation fails
- ✅ Error: "Department code already exists at foundation level"

**Then**:
1. Create school department (School A) with code "TEST"

**Expected Results**:
- ✅ Creation succeeds (different scope)
- ✅ Foundation "TEST" and School A "TEST" coexist

---

#### Test 4.2: Parent-Child Validation Matrix

| Test Case | Child School | Parent School | Should Pass? | Error Message |
|-----------|--------------|---------------|--------------|---------------|
| TC 4.2.1 | Foundation | Foundation | ✅ Yes | - |
| TC 4.2.2 | Foundation | School A | ✅ Yes | - |
| TC 4.2.3 | School A | Foundation | ✅ Yes | - |
| TC 4.2.4 | School A | School A | ✅ Yes | - |
| TC 4.2.5 | School A | School B | ❌ No | "Cannot select parent from different school" |

Execute all test cases in the table and verify results.

---

### 5. Performance Tests

#### Test 5.1: Load Time with Large Dataset
**Test Conditions**:
- 50 foundation departments
- 100 school departments across 10 schools
- All departments loaded in modal

**Steps**:
1. Open Create Department modal
2. Measure load time

**Expected Results**:
- ✅ Modal opens in < 500ms
- ✅ Departments load in < 1000ms
- ✅ Dropdown remains responsive
- ✅ Search/filter performs instantly
- ✅ No lag when scrolling dropdown

**Performance Metrics**:
- Initial render: < 500ms
- Data fetch: < 1000ms
- Dropdown open: < 100ms
- Search response: < 50ms

---

#### Test 5.2: RTK Query Caching
**Steps**:
1. Open Create Department modal → Close
2. Open again immediately
3. Observe loading behavior

**Expected Results**:
- ✅ Second open uses cached data
- ✅ No API request on second open
- ✅ Departments appear instantly
- ✅ Network tab shows cache hit

---

### 6. Edge Cases & Error Handling

#### Test 6.1: Empty Department List
**Steps**:
1. Delete all departments (test environment)
2. Open Create Department modal
3. Observe parent dropdown

**Expected Results**:
- ✅ Parent dropdown shows "No departments found"
- ✅ Can still create department without parent
- ✅ No errors or crashes

---

#### Test 6.2: API Timeout
**Steps**:
1. Simulate slow/timeout API response
2. Open Create Department modal
3. Observe behavior

**Expected Results**:
- ✅ Loading spinner shows
- ✅ Timeout handled gracefully
- ✅ Error message if request fails
- ✅ Retry mechanism (if implemented)

---

#### Test 6.3: Invalid School ID
**Steps**:
1. Create department with schoolId that doesn't exist
2. Observe backend response

**Expected Results**:
- ✅ Backend validation fails
- ✅ Error toast with clear message
- ✅ Form stays open for correction

---

### 7. Accessibility Tests

#### Test 7.1: Keyboard Navigation
**Steps**:
1. Open Create Department modal
2. Use Tab key to navigate through form
3. Use Enter to submit

**Expected Results**:
- ✅ All form fields reachable via Tab
- ✅ Dropdowns open with Enter/Space
- ✅ Can select options with arrow keys
- ✅ Form submits with Enter on submit button
- ✅ Esc closes modal

---

#### Test 7.2: Screen Reader
**Steps**:
1. Enable screen reader
2. Navigate Create Department form
3. Listen to announcements

**Expected Results**:
- ✅ Field labels announced correctly
- ✅ Required fields indicated
- ✅ Error messages announced
- ✅ Dropdown options announced with grouping
- ✅ Success/error toasts announced

---

### 8. Cross-Browser Testing

Test all scenarios above on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Focus Areas**:
- Visual consistency
- Dropdown behavior
- Touch interactions (mobile)
- Performance characteristics

---

## Automated Test Scripts

### Playwright E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('Foundation Departments', () => {
  test('should create foundation-level department', async ({ page }) => {
    await page.goto('/organizations/departments');
    await page.click('button:has-text("Create Department")');

    await page.fill('input[name="name"]', 'Test Foundation Dept');
    await page.fill('input[name="code"]', 'TFD');
    await page.selectOption('select[name="school"]', 'none');
    await page.click('button:has-text("Create Department")');

    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('text=Test Foundation Dept')).toBeVisible();
  });

  test('should show grouped parent options', async ({ page }) => {
    await page.goto('/organizations/departments');
    await page.click('button:has-text("Create Department")');

    await page.click('[data-testid="parent-department-dropdown"]');

    await expect(page.locator('text=Foundation Level')).toBeVisible();
    await expect(page.locator('svg.text-blue-500')).toHaveCount(3); // 3 foundation depts
  });

  test('should prevent cross-school parent selection', async ({ page }) => {
    await page.goto('/organizations/departments');
    await page.click('button:has-text("Create Department")');

    await page.fill('input[name="name"]', 'Test Dept');
    await page.selectOption('select[name="school"]', 'school-a-id');
    await page.selectOption('select[name="parent"]', 'school-b-dept-id');

    await page.click('button:has-text("Create Department")');

    await expect(page.locator('.toast-error')).toHaveText(
      /Cannot select parent from different school/
    );
  });
});
```

---

## Test Execution Plan

### Phase 1: Manual Testing (Day 1-2)
1. ✅ Execute all UI/UX tests
2. ✅ Execute all integration tests
3. ✅ Document any issues found

### Phase 2: Edge Cases & Performance (Day 3)
1. ✅ Execute edge case scenarios
2. ✅ Performance testing with large datasets
3. ✅ Accessibility audit

### Phase 3: Cross-Browser & Mobile (Day 4)
1. ✅ Cross-browser testing
2. ✅ Mobile responsiveness testing
3. ✅ Touch interaction testing

### Phase 4: Automated Tests (Day 5)
1. ✅ Write Playwright E2E tests
2. ✅ Add to CI/CD pipeline
3. ✅ Establish regression test suite

---

## Bug Report Template

```markdown
**Test Case**: [Test number and name]
**Severity**: [Critical / High / Medium / Low]
**Browser**: [Chrome 120 / Firefox 121 / etc.]
**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected Result**:
...

**Actual Result**:
...

**Screenshots/Videos**:
[Attach if applicable]

**Console Errors**:
```
[Paste console errors]
```

**Network Logs**:
[Relevant API requests/responses]
```

---

## Test Coverage Report Template

```markdown
## Test Execution Summary

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: [Staging / Production]

### Coverage Statistics
- Total Test Cases: X
- Passed: X (Y%)
- Failed: X (Y%)
- Blocked: X (Y%)
- Not Executed: X (Y%)

### Critical Issues Found
1. [Issue description] - Severity: [High/Critical]
2. ...

### Recommendations
- ...
```

---

## Post-Deployment Verification

After deployment to production:

1. [ ] Smoke test: Create foundation department
2. [ ] Smoke test: Create school department
3. [ ] Smoke test: Edit existing departments
4. [ ] Verify existing departments still display correctly
5. [ ] Check API response times under production load
6. [ ] Monitor error rates for 24 hours
7. [ ] Collect user feedback

---

## Success Criteria

✅ **All tests pass** in test environment
✅ **No critical bugs** found
✅ **Performance** meets defined thresholds
✅ **Cross-browser** compatibility verified
✅ **Accessibility** standards met (WCAG 2.1 AA)
✅ **User acceptance** testing passed
✅ **Documentation** complete and accurate

---

## Questions & Support

**Testing Team**: [Contact]
**Development Team**: [Contact]
**Documentation**: This file + backend requirements doc
