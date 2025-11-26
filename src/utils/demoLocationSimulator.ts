export function startSimulatedMovement(lat:number, lng:number, onUpdate:(lat:number,lng:number)=>void) {
  let _lat = lat;
  let _lng = lng;
  const id = setInterval(()=>{
    _lat += (Math.random()-0.5)*0.0008;
    _lng += (Math.random()-0.5)*0.0008;
    onUpdate(_lat,_lng);
  }, 3000);
  return ()=>clearInterval(id);
}
