import {loadState,saveState} from "../services/storage.js"

const base={
session:{loggedIn:false,user:null},
ui:{view:"dashboard"},
team:{
name:"Warriors Varsity",
joinCode:"PIQ1234",
athletes:[
{id:"1",name:"James Carter",position:"PG",piq:82},
{id:"2",name:"Marcus Lee",position:"SG",piq:74}
]
}
}

export function initState(){
const saved=loadState()
return saved?saved:structuredClone(base)
}

export function persist(state){
saveState(state)
}
