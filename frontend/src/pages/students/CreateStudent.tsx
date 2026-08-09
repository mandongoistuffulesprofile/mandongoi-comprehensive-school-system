import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { studentsApi } from "../../api/students";
import { guardiansApi } from "../../api/guardians";
import { Button, PageHeader, Card, EnumBadge } from "../../components/ui/Basics";
import { BackButton } from "../../components/ui/BackButton";
import { FormField } from "../../components/ui/FormField";
import { useToast } from "../../lib/toast";
import { LEVELS } from "../../types";
import clsx from "clsx";

const FOOD_PROGRAM_OPTIONS = [
  { value: "none", label: "N/A (Day Scholar)" },
  { value: "pay_fee", label: "Pay Fee (Boarding)" },
  { value: "bring_own", label: "Bring Own Food (Logged Manually)" },
];

export default function CreateStudent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("male");
  const [level, setLevel] = useState("comprehensive");
  const [grade, setGrade] = useState("");
  const [studentType, setStudentType] = useState<"boarding" | "day">("day");
  const [boardingHouse, setBoardingHouse] = useState("");
  const [foodProgramType, setFoodProgramType] = useState<"bring_own" | "pay_fee" | "none">("none");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [enrollmentDate, setEnrollmentDate] = useState("");
  const [nemisId, setNemisId] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const selectedLevel = LEVELS.find((l) => l.value === level);
  const gradeOptions = selectedLevel?.grades ?? [];

  function reset() {
    setFirstName("");
    setLastName("");
    setGender("male");
    setLevel("comprehensive");
    setGrade("");
    setStudentType("day");
    setBoardingHouse("");
    setFoodProgramType("none");
    setDateOfBirth("");
    setEnrollmentDate("");
    setNemisId("");
    setGuardianName("");
    setGuardianPhone("");
    setGuardianRelationship("");
  }

  async function save(andThen: "another" | "view") {
    if (!firstName || !lastName || !grade) {
      toast.add("error", "First name, last name, and grade are required");
      return;
    }
    setSaving(true);
    try {
      const student = await studentsApi.create({
        firstName, lastName, gender, level, grade, nemisId: nemisId || undefined,
        studentType,
        boardingHouse: boardingHouse || undefined,
        foodProgramType,
        dateOfBirth: dateOfBirth || undefined,
        enrollmentDate: enrollmentDate || undefined,
        status: "active",
      });
      if (guardianName && guardianPhone) {
        await guardiansApi.create({
          studentId: student.id,
          name: guardianName,
          phone: guardianPhone,
          relationship: guardianRelationship || "parent",
          isPrimary: true,
        });
      }
      setSavedCount((c) => c + 1);
      toast.add("success", `Student saved (${savedCount + 1})`);
      if (andThen === "another") {
        reset();
      } else {
        navigate(`/students/${student.id}`);
      }
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <BackButton to="/students" label="Back to Students" />
        {savedCount > 0 && (
          <span className="text-emerald-600 text-xs font-medium bg-emerald-50 px-3 py-1 rounded-full">
            {savedCount} saved this session
          </span>
        )}
      </div>

      <PageHeader
        title="Register New Student"
        description="Comprehensive School — Pre-Primary (PP1-PP2) and Grade 1-9. Boarding and Day Scholar."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="p-6 space-y-5">
          <h3 className="font-semibold text-on-surface text-lg flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container text-xs font-bold flex items-center justify-center">1</span>
            Student Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField spec={{ name: "firstName", label: "First Name", required: true }} value={firstName} onChange={(v) => setFirstName(v as string)} />
            <FormField spec={{ name: "lastName", label: "Last Name", required: true }} value={lastName} onChange={(v) => setLastName(v as string)} />
          </div>
          <FormField spec={{ name: "gender", label: "Gender", type: "select", options: [{ value: "male", label: "Male" }, { value: "female", label: "Female" }] }} value={gender} onChange={(v) => setGender(v as string)} />
          <FormField spec={{ name: "dateOfBirth", label: "Date of Birth (optional)", type: "date", max: new Date().toISOString().slice(0, 10) }} value={dateOfBirth} onChange={(v) => setDateOfBirth(v as string)} />
          <div className="grid grid-cols-2 gap-4">
            <FormField spec={{ name: "level", label: "Level", type: "select", required: true, options: LEVELS.map((l) => ({ value: l.value, label: l.label })) }} value={level} onChange={(v) => { setLevel(v as string); setGrade(""); }} />
            <FormField spec={{ name: "grade", label: "Grade", type: "select", required: true, options: gradeOptions.map((g) => ({ value: g, label: g })) }} value={grade} onChange={(v) => setGrade(v as string)} />
          </div>
          <FormField spec={{ name: "nemisId", label: "NEMIS ID (optional)", helpText: "National Education Management Information System identifier" }} value={nemisId} onChange={(v) => setNemisId(v as string)} />
          <FormField spec={{ name: "enrollmentDate", label: "Enrollment Date (optional)", type: "date", max: new Date().toISOString().slice(0, 10) }} value={enrollmentDate} onChange={(v) => setEnrollmentDate(v as string)} />
        </Card>

        <div className="space-y-6">
          <Card className="p-6 space-y-5">
            <h3 className="font-semibold text-on-surface text-lg flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">2</span>
              Accommodation & Food
            </h3>
            <FormField
              spec={{ name: "studentType", label: "Student Type", type: "select", required: true, options: [{ value: "day", label: "Day Scholar" }, { value: "boarding", label: "Boarding" }] }}
              value={studentType} onChange={(v) => { setStudentType(v as "boarding" | "day"); if (v === "day") { setFoodProgramType("none"); setBoardingHouse(""); } }}
            />
            {studentType === "boarding" && (
              <>
                <FormField spec={{ name: "boardingHouse", label: "Boarding House / Dormitory", placeholder: "e.g. Lions, Dolphin" }} value={boardingHouse} onChange={(v) => setBoardingHouse(v as string)} />
                <FormField
                  spec={{ name: "foodProgramType", label: "Food Programme", type: "select", required: true, options: FOOD_PROGRAM_OPTIONS }}
                  value={foodProgramType} onChange={(v) => setFoodProgramType(v as "bring_own" | "pay_fee" | "none")}
                />
                {foodProgramType === "bring_own" && (
                  <div className="flex items-center gap-2 bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded-lg">
                    <span>📝</span>
                    <span>Food items will be logged manually via the Food Logs page. The food fee will be deducted from this student's invoice.</span>
                  </div>
                )}
                {foodProgramType === "pay_fee" && (
                  <div className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs px-3 py-2 rounded-lg">
                    <span>🍲</span>
                    <span>The food programme fee from the fee structure will be included in this student's invoice.</span>
                  </div>
                )}
              </>
            )}
            {studentType === "day" && (
              <div className="flex items-center gap-2 bg-surface-container text-on-surface-variant text-xs px-3 py-2 rounded-lg">
                <span>🏠</span>
                <span>Day scholar — boarding and food fees do not apply.</span>
              </div>
            )}
          </Card>

          <Card className="p-6 space-y-5">
            <h3 className="font-semibold text-on-surface text-lg flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container text-xs font-bold flex items-center justify-center">3</span>
              Guardian / SMS Contact
            </h3>
            <p className="text-xs text-on-surface-variant -mt-2">Results, fee reminders & term dates sent to this phone</p>
            <FormField spec={{ name: "guardianName", label: "Guardian Name (optional)" }} value={guardianName} onChange={(v) => setGuardianName(v as string)} />
            <FormField spec={{ name: "guardianPhone", label: "Phone (2547XXXXXXXX)", placeholder: "2547XXXXXXXX" }} value={guardianPhone} onChange={(v) => setGuardianPhone(v as string)} />
            <FormField spec={{ name: "guardianRelationship", label: "Relationship" }} value={guardianRelationship} onChange={(v) => setGuardianRelationship(v as string)} />
          </Card>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" onClick={() => navigate("/students")}>Cancel</Button>
        <Button
          onClick={() => save("another")}
          disabled={saving}
          variant="secondary"
          className={clsx(savedCount > 0 && "ring-2 ring-primary/30")}
        >
          {saving ? "Saving..." : savedCount > 0 ? `Save & Add Another (${savedCount + 1})` : "Save & Add Another"}
        </Button>
        <Button onClick={() => save("view")} disabled={saving}>
          {saving ? "Saving..." : "Save & View Profile"}
        </Button>
      </div>
    </div>
  );
}
