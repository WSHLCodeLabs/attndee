/**
 * Teacher Cloud Backup Service (Supabase Storage + RLS Metadata)
 *
 * Purpose:
 * - Cross-device cloud backup specifically designed for Kasetsart University (.xlsx) rosters.
 * - Uses UUID-based ASCII storage paths (`{teacher_id}/{file_id}.xlsx`) inside the private
 *   `teacher-rosters` bucket so Thai filenames, spaces, and parentheses never cause S3 key errors.
 * - Strictly tied to the authenticated teacher's `auth.uid()` via Postgres & Storage RLS.
 */

import { supabase, TeacherCloudFile } from '@/utils/supabase';

export const TEACHER_ROSTERS_BUCKET = 'teacher-rosters';

const XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * List all cloud-backed Excel files belonging to the currently signed-in teacher
 */
export async function listTeacherCloudFiles(): Promise<TeacherCloudFile[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return [];
  }

  const { data, error } = await supabase
    .from('teacher_cloud_files')
    .select('*')
    .eq('teacher_id', session.user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to list teacher cloud files:', error.message);
    return [];
  }

  return (data as TeacherCloudFile[]) || [];
}

/**
 * Upload or overwrite (upsert) a teacher's KU Excel file in Supabase Storage + metadata table.
 * Safe no-op if the teacher is not signed in.
 */
export async function upsertTeacherCloudFile(params: {
  fileBlob: Blob | File;
  filename: string;
  courseName?: string;
  studentCount?: number;
}): Promise<TeacherCloudFile | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  const teacherId = session.user.id;
  const cleanFilename = params.filename.trim() || 'student_list.xlsx';

  // 1. Check if this teacher already has a cloud file with the same filename
  const { data: existing } = await supabase
    .from('teacher_cloud_files')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('filename', cleanFilename)
    .maybeSingle();

  const fileId =
    existing?.id ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  // Generate a versioned storage path on every save to completely bust browser & CDN caches
  const previousStoragePath = existing?.storage_path;
  const storagePath = `${teacherId}/${fileId}_${Date.now()}.xlsx`;

  // 2. Upload binary .xlsx to private Supabase Storage bucket
  const { error: uploadError } = await supabase.storage
    .from(TEACHER_ROSTERS_BUCKET)
    .upload(storagePath, params.fileBlob, {
      upsert: true,
      cacheControl: '0',
      contentType: XLSX_MIME_TYPE,
    });

  if (uploadError) {
    throw new Error(`ไม่สามารถอัปโหลดไฟล์ขึ้น Cloud ได้: ${uploadError.message}`);
  }

  // Remove previous storage object version if overwritten
  if (previousStoragePath && previousStoragePath !== storagePath) {
    await supabase.storage
      .from(TEACHER_ROSTERS_BUCKET)
      .remove([previousStoragePath])
      .catch(() => {});
  }

  // 3. Upsert metadata row in public.teacher_cloud_files
  const nowIso = new Date().toISOString();
  const payload = {
    id: fileId,
    teacher_id: teacherId,
    filename: cleanFilename,
    storage_path: storagePath,
    course_name: params.courseName ?? existing?.course_name ?? null,
    student_count:
      params.studentCount !== undefined
        ? params.studentCount
        : (existing?.student_count ?? 0),
    file_size: params.fileBlob.size,
    updated_at: nowIso,
  };

  const { data: savedRow, error: dbError } = await supabase
    .from('teacher_cloud_files')
    .upsert(payload, { onConflict: 'teacher_id,filename' })
    .select('*')
    .single();

  if (dbError) {
    throw new Error(`ไม่สามารถบันทึกข้อมูลไฟล์ Cloud ได้: ${dbError.message}`);
  }

  return savedRow as TeacherCloudFile;
}

/**
 * Download a cloud-backed Excel file and reconstruct a native browser `File` object
 * so it can be fed directly into `processFile(file)` just like drag-and-drop.
 */
export async function downloadTeacherCloudFile(
  cloudFile: TeacherCloudFile
): Promise<File> {
  const { data, error } = await supabase.storage
    .from(TEACHER_ROSTERS_BUCKET)
    .download(cloudFile.storage_path);

  if (error || !data) {
    throw new Error(
      `ไม่สามารถดาวน์โหลดไฟล์จาก Cloud ได้: ${error?.message || 'ไม่พบไฟล์'}`
    );
  }

  return new File([data], cloudFile.filename, {
    type: XLSX_MIME_TYPE,
    lastModified: new Date(cloudFile.updated_at).getTime(),
  });
}

/**
 * Delete a teacher's Excel file from both Supabase Storage and the metadata table
 */
export async function deleteTeacherCloudFile(
  cloudFile: TeacherCloudFile
): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(TEACHER_ROSTERS_BUCKET)
    .remove([cloudFile.storage_path]);

  if (storageError) {
    console.warn('Storage delete warning:', storageError.message);
  }

  const { error: dbError } = await supabase
    .from('teacher_cloud_files')
    .delete()
    .eq('id', cloudFile.id);

  if (dbError) {
    throw new Error(`ไม่สามารถลบไฟล์ออกจากฐานข้อมูลได้: ${dbError.message}`);
  }
}
