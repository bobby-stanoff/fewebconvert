import { UploadResponse, backendURL, CreateJobRequest, JobResponse, JobStatusResponse } from "./types";
export async function uploadFile(f : File) : Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file',f);

    const response = await fetch(backendURL + "/api/upload",{
        method: "POST",
        body: formData
    });
    if(!response.ok){
        throw new Error(`Upload failed: ${response.statusText}`)
    }

    return response.json();

}

export async function createJob(j : CreateJobRequest) : Promise<JobResponse>{
    const response = await fetch(backendURL + "/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(j)
    })
    if(response.status !== 202){
        console.error(response.statusText)
        throw new Error("something went wrong")
    }
    return response.json()
}

export async function checkJob(jid: String) : Promise<JobStatusResponse>{
    const response = await fetch(backendURL + `/api/jobs/${jid}`)
    if(response.status !== 200){
        console.error(`job ${jid} not found`)
        throw new Error(`process failed, file not found`)
    }
    return response.json()


}

export function setupDropZone(dropZoneElement: HTMLElement, fileInputElement: HTMLInputElement,  onFileSelected: (file: File) => void) {

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZoneElement.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZoneElement.addEventListener(eventName, () => {
      dropZoneElement.classList.add('active');
      dropZoneElement.style.borderColor = 'var(--primary)';
      dropZoneElement.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZoneElement.addEventListener(eventName, () => {
      dropZoneElement.classList.remove('active');
      dropZoneElement.style.borderColor = ''; // reset to CSS default
      dropZoneElement.style.backgroundColor = '';
    });
  });

  dropZoneElement.addEventListener('drop', (e: DragEvent) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      onFileSelected(dt.files[0]);
    }
  });

  dropZoneElement.addEventListener('click', () => {
    fileInputElement.click();
  });


  fileInputElement.addEventListener('change', () => {
    if (fileInputElement.files && fileInputElement.files.length > 0) {
      onFileSelected(fileInputElement.files[0]);
    }
  });
}
