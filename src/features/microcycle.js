// ─── Default weekly templates per sport ───────────────────────────────────
const TEMPLATES = {
  basketball: [
    { day:"Mon", label:"Explosive Lower"     },
    { day:"Tue", label:"Recovery + Mobility" },
    { day:"Wed", label:"Upper Strength"      },
    { day:"Thu", label:"Speed + COD"         },
    { day:"Fri", label:"Flush + Reset"       },
  ],
  football: [
    { day:"Mon", label:"Power + Strength"    },
    { day:"Tue", label:"Film + Recovery"     },
    { day:"Wed", label:"Conditioning"        },
    { day:"Thu", label:"Speed + Agility"     },
    { day:"Fri", label:"Activation + Rest"   },
  ],
  soccer: [
    { day:"Mon", label:"Strength Lower"      },
    { day:"Tue", label:"Aerobic Base"        },
    { day:"Wed", label:"Speed Endurance"     },
    { day:"Thu", label:"Tactical + COD"      },
    { day:"Fri", label:"Flush + Mobility"    },
  ],
  baseball: [
    { day:"Mon", label:"Rotational Power"    },
    { day:"Tue", label:"Arm Care + Mobility" },
    { day:"Wed", label:"Lower Strength"      },
    { day:"Thu", label:"Speed + Agility"     },
    { day:"Fri", label:"Recovery"            },
  ],
  volleyball: [
    { day:"Mon", label:"Explosive Power"     },
    { day:"Tue", label:"Upper Strength"      },
    { day:"Wed", label:"Conditioning"        },
    { day:"Thu", label:"Jump Training"       },
    { day:"Fri", label:"Mobility + Flush"    },
  ],
  track: [
    { day:"Mon", label:"Max Velocity"        },
    { day:"Tue", label:"Strength Lower"      },
    { day:"Wed", label:"Speed Endurance"     },
    { day:"Thu", label:"Technical Work"      },
    { day:"Fri", label:"Activation + Rest"   },
  ],
};

// JS getDay(): 0=Sun, 1=Mon … 5=Fri, 6=Sat
// Map to Mon–Fri index (0–4). Weekend = -1.
function getTodayIndex() {
  const d = new Date().getDay();
  return d >= 1 && d <= 5 ? d - 1 : -1;
}

export function buildMicrocycle(sport = "basketball") {
  const template = TEMPLATES[sport] ?? TEMPLATES.basketball;
  const todayIdx = getTodayIndex();
  return template.map((d, i) => ({
    ...d,
    status: i < todayIdx ? "done" : i === todayIdx ? "today" : "upcoming",
  }));
}
