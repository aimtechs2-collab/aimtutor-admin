import { UserProfile } from "@clerk/nextjs";

export default function AdminProfilePage() {
  return (
    <div className="flex justify-center">
      <UserProfile path="/admin/profile" routing="path" appearance={{ elements: { rootBox: "w-full" } }} />
    </div>
  );
}
