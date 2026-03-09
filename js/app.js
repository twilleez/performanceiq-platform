const app = document.getElementById('app');

function renderDashboard(){
app.innerHTML = `
<div class="card">
<h2>Dashboard</h2>
<p>PerformanceIQ system running.</p>
<button onclick="generateWorkout()">Generate Workout</button>
</div>
<div id="workout"></div>
`;
}

function generateWorkout(){
const workout = `
<div class="card">
<h3>Sample Workout</h3>
<ul>
<li>Goblet Squat 4x8</li>
<li>Dumbbell Bench Press 4x8</li>
<li>Pull Ups 3x6</li>
<li>Box Jumps 4x4</li>
<li>Pallof Press 3x12</li>
</ul>
</div>
`;

document.getElementById("workout").innerHTML = workout;
}

renderDashboard();