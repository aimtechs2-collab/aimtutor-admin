import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

export async function savePublicUpload(file: File, subdir: string): Promise<string> {
  const rawExt = file.name.split(".").pop() || "bin";
  const ext = rawExt.replace(/[^a-zA-Z0-9]/g, "") || "bin";
  const name = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
  const dir = join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(join(dir, name), buf);
  return `/uploads/${subdir}/${name}`;
}

function setField(body: Record<string, unknown>, key: string, value: string) {
  if (value === "") return;
  if (key === "duration_minutes") {
    const n = Number(value);
    body[key] = Number.isFinite(n) ? n : 0;
    return;
  }
  if (key === "is_preview") {
    body[key] = value === "true" || value === "1";
    return;
  }
  body[key] = value;
}

export async function parseMultipartCourseBody(req: Request): Promise<Record<string, unknown>> {
  const fd = await req.formData();
  const body: Record<string, unknown> = {};
  for (const [key, value] of fd.entries()) {
    if (value instanceof File) {
      if (key === "thumbnail" && value.size > 0) {
        body.thumbnail = await savePublicUpload(value, "course-thumbnails");
      }
    } else {
      setField(body, key, String(value));
    }
  }
  return body;
}

export async function parseMultipartLessonBody(req: Request): Promise<Record<string, unknown>> {
  const fd = await req.formData();
  const body: Record<string, unknown> = {};
  for (const [key, value] of fd.entries()) {
    if (value instanceof File) {
      if (key === "video" && value.size > 0) {
        body.video_url = await savePublicUpload(value, "lesson-videos");
      }
    } else {
      setField(body, key, String(value));
    }
  }
  return body;
}

export async function parseMultipartLessonResourceBody(req: Request): Promise<Record<string, unknown>> {
  const fd = await req.formData();
  const body: Record<string, unknown> = {};
  for (const [key, value] of fd.entries()) {
    if (value instanceof File) {
      if (key === "file" && value.size > 0) {
        body.file_path = await savePublicUpload(value, "lesson-resources");
        body.file_type = value.type || null;
        body.file_size = value.size;
      }
    } else {
      setField(body, key, String(value));
    }
  }
  return body;
}

export async function getJsonOrMultipartBody(
  req: Request,
  method: string,
  pathSegments: string[],
): Promise<unknown> {
  const joined = pathSegments.join("/");
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    if (method === "POST" && joined === "courses/create-courses") return parseMultipartCourseBody(req);
    if (method === "PUT" && pathSegments[0] === "courses" && pathSegments[1] === "update-courses") {
      return parseMultipartCourseBody(req);
    }
    if (method === "POST" && pathSegments[0] === "lessons" && pathSegments[1] === "create-lessons") {
      return parseMultipartLessonBody(req);
    }
    if (method === "PUT" && pathSegments[0] === "lessons" && pathSegments[1] === "update-lessons") {
      return parseMultipartLessonBody(req);
    }
    if (
      method === "POST" &&
      pathSegments[0] === "lesson-resources" &&
      pathSegments[1] === "create-lesson-resources"
    ) {
      return parseMultipartLessonResourceBody(req);
    }
    if (
      method === "PUT" &&
      pathSegments[0] === "lesson-resources" &&
      pathSegments[1] === "update-lesson-resources"
    ) {
      return parseMultipartLessonResourceBody(req);
    }
    return null;
  }
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    return await req.json().catch(() => null);
  }
  return null;
}
