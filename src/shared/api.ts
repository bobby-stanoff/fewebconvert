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