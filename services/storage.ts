
import { SceneDescription, VideoOrientation } from "../types";

const DB_NAME = "SonicStudioProDB";
const DB_VERSION = 4; // Version Bump for Schema Change
const STORE_PROJECTS = "projects";
const STORE_SCENES = "scenes";
const STORE_USERS = "users";
const SESSION_KEY = "ton_moves_last_session";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
  phone?: string;
}

export interface ProjectData {
  id: string;
  userId: string;
  projectCode: string;
  name: string;
  duration: number;
  lastUpdated: number;
  totalCost?: number;
  orientation: VideoOrientation;
  audioData?: ArrayBuffer; // Added to store the actual audio file
  mimeType?: string;
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
      } else {
        // Migration logic if needed, but adding a field usually doesn't break put()
      }
      if (!db.objectStoreNames.contains(STORE_SCENES)) {
        db.createObjectStore(STORE_SCENES, { keyPath: "compositeId" });
      }
      if (!db.objectStoreNames.contains(STORE_USERS)) {
        db.createObjectStore(STORE_USERS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveLastSessionId = (id: string) => localStorage.setItem(SESSION_KEY, id);
export const getLastSessionId = () => localStorage.getItem(SESSION_KEY);
export const clearLastSessionId = () => localStorage.removeItem(SESSION_KEY);

export const saveUser = async (user: UserProfile) => {
  const db = await initDB();
  const tx = db.transaction(STORE_USERS, "readwrite");
  tx.objectStore(STORE_USERS).put(user);
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  const db = await initDB();
  const tx = db.transaction(STORE_USERS, "readonly");
  const request = tx.objectStore(STORE_USERS).getAll();
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result[0] || null);
  });
};

export const saveProject = async (project: ProjectData) => {
  const db = await initDB();
  const tx = db.transaction(STORE_PROJECTS, "readwrite");
  tx.objectStore(STORE_PROJECTS).put(project);
  saveLastSessionId(project.id);
};

export const getAllProjects = async (userId: string): Promise<ProjectData[]> => {
  const db = await initDB();
  const tx = db.transaction(STORE_PROJECTS, "readonly");
  const request = tx.objectStore(STORE_PROJECTS).getAll();
  return new Promise((resolve) => {
    request.onsuccess = () => {
      const all = request.result as ProjectData[];
      // Return lightweight metadata list (exclude audioData to prevent memory bloat on list)
      const lightweight = all
        .filter(p => p.userId === userId)
        .map(({ audioData, ...rest }) => rest as ProjectData);
      resolve(lightweight);
    };
  });
};

export const getProject = async (id: string): Promise<ProjectData | null> => {
  const db = await initDB();
  const tx = db.transaction(STORE_PROJECTS, "readonly");
  const request = tx.objectStore(STORE_PROJECTS).get(id);
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result || null);
  });
};

export const saveScene = async (projectId: string, scene: SceneDescription) => {
  const db = await initDB();
  const tx = db.transaction(STORE_SCENES, "readwrite");
  tx.objectStore(STORE_SCENES).put({
    ...scene,
    projectId,
    compositeId: `${projectId}_${scene.id}`
  });
};

export const getProjectScenes = async (projectId: string): Promise<SceneDescription[]> => {
  const db = await initDB();
  const tx = db.transaction(STORE_SCENES, "readonly");
  const request = tx.objectStore(STORE_SCENES).getAll();
  return new Promise((resolve) => {
    request.onsuccess = () => {
      const all = request.result as any[];
      resolve(all
        .filter(s => s.projectId === projectId)
        .sort((a, b) => {
          const timeA = a.timestamp.split(':').reduce((acc: number, t: string) => acc * 60 + +t, 0);
          const timeB = b.timestamp.split(':').reduce((acc: number, t: string) => acc * 60 + +t, 0);
          return timeA - timeB;
        })
      );
    };
  });
};

export const exportProjectData = async (projectId: string) => {
  const project = await getProject(projectId);
  const scenes = await getProjectScenes(projectId);
  // Do not export audioData in JSON to keep file size manageable and avoid stringify crashes
  const { audioData, ...projectMeta } = project || {}; 
  const data = { project: projectMeta, scenes };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = project?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'backup';
  a.download = `${safeName}_ton_moves_backup.json`;
  a.click();
};

export const importProjectData = async (jsonString: string, userId: string): Promise<string> => {
  try {
    const data = JSON.parse(jsonString);
    if (!data.project || !data.scenes) throw new Error("JSON Inválido");
    // Note: Imported projects via JSON won't have audioData, user might need to re-upload audio
    // but the structure supports it.
    const project = { ...data.project, userId, lastUpdated: Date.now() };
    await saveProject(project);
    for (const scene of data.scenes) {
      await saveScene(project.id, scene);
    }
    return project.id;
  } catch (e) {
    throw new Error("Falha ao processar arquivo de backup.");
  }
};
