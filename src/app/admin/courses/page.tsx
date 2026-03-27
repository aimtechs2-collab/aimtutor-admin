import { redirect } from "next/navigation";

/** Aim_Admin_Portal: `/admin/courses` (Add Master Category) → catalog. */
export default function AdminCoursesAliasPage() {
  redirect("/admin/catalog");
}
