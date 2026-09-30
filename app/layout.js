import './globals.css';
export const metadata={title:'Carlsbad Baseball Calendar',description:'Carlsbad High School Baseball schedule'};
function Mark(){return <img className="brandlogo" src="/carlsbad-logo.png" alt="Carlsbad Baseball logo" />}
export default function RootLayout({children}){return <html lang="en"><body><header><div className="brand"><div className="brandleft"><Mark/><div><h1>CARLSBAD BASEBALL</h1><small>LANCERS • OFFICIAL SCHEDULE</small></div></div><div className="headerbadge">CHS</div></div></header>{children}</body></html>}
