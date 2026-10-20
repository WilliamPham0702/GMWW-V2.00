// The proof file is committed only after the official build and downloaded
// asset SHA-256 have been verified. It does not raise the minimum OTA shell.
export function selectPublishedIpa(proof,runtime,shell){
 const valid=v=>/^\d+\.\d+$/.test(String(v));
 const compare=(a,b)=>a.localeCompare(b,undefined,{numeric:true});
 const ready=proof&&valid(proof.version)&&compare(proof.version,shell)>=0&&compare(proof.version,runtime)<=0&&/^[a-f0-9]{64}$/.test(proof.sha256)&&Number.isSafeInteger(proof.size)&&proof.size>50000000;
 const version=ready?proof.version:shell;
 return {version,fileName:`GMWW-V${version}.ipa`,url:`https://github.com/WilliamPham0702/GMWW-V2.00/releases/download/gmww-v${version}/GMWW-V${version}.ipa`,...(ready?{sha256:proof.sha256,size:proof.size}:{})};
}
