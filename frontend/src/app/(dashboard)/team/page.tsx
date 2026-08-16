import Image from 'next/image'

// Array of team members, quite a static method to store team members information, it work tho I am not sure it's the best
const teamMembers = [
    {
    name: 'Nawres Kas Toma',
    role: 'Project Manager',
    description:(
        <>
            <p>
                I’m a final-semester Bachelor of IT student majoring in Cyber Security, with experience in OSINT, penetration testing, and cybersecurity. 
            </p>
            <p>
                I also competed nationally in WorldSkills Cyber Security and have a strong interest in offensive security and practical cybersecurity.
            </p>
        </>
        ),
    image: '/images/team/Nawres.png',
    },
    {
        name: 'Scarlet Heng',
        role: 'Business Analyst',
        description: (
        <>
            <p>
                Final year in bachelor of IT with experience in systems, data, SAP, Power BI and Power Apps.
            </p>
            <p>
                Interested in business analysis, process improvement and using technology to solve business problems.
            </p>
        </>
        ),
        image: '/images/team/Scarlet.png',
    },
    {
        name: 'Arman Gholami',
        role: 'UX',
        description: (
            <>
                <p>
                    Third year in Bachelors of IT, pathwayed from Associate Degree in IT.
                    Familiar with React, Java, Python, HTML, CSS.
                </p>
                <p>
                    Current role is UX, with some familiarity of User-Centred Design.
                </p>
                <p>
                    Outside of this, can be found drawing, bouldering, or playing arcade rhythm games.
                </p>
            </>
        ),
        image: '/images/team/Arman.png',
    },
    {
        name: 'Minh Quang Tran',
        role: 'Developer',
        description: (
        <>
            <p>
                I am a third year Bachelor of Computer Science (Professional) student, minoring in AI and Data Science.
            </p>
            <p>
                I have experience in data analysis, data visualization, and machine learning.
            </p>
            <p>
                I also have knownledge and experience in Game Development through Unity, and foundational knowledge in cloud computing and computing theory.
            </p>

        </>
        ),
        image: '/images/team/Minarsh.png',
    },
        {
        name: 'Nihal Reddy Gaddam',
        role: 'Developer',
        description: (
        <>
            <p>
                I’m a technology professional passionate about building innovative digital solutions, solving complex problems, and continuously learning in the ever-evolving world of tech.
            </p>
            <p>
                With a strong interest in software, cybersecurity, and emerging technologies, I’m driven by curiosity, creativity, and meaningful impact.
            </p>
        </>
        ),
        image: '/images/team/Nihal.png',
    },
]

export default function TeamPage() {

    return (
    // min-h-full stretches this div to fill <main>'s full content-box height
    // (DashboardShell.tsx's <main> has a definite height via flexbox
    <div className = "flex min-h-full flex-col bg-zinc-50 dark:bg-zinc-950">
        {/*Project Header*/}
        {/*  PM wants the everything to be full width, so header, subheader, and cards share one width. */}
        <header className = "w-full bg-brand-red px-4 py-3 sm:px-6 md:px-8">
        <h1 className = "text-lg font-normal text-white sm:text-xl md:text-2xl">
            Project 29 Garage - AI Assistant for HR
        </h1>
        </header>
      {/* Sub Header */}
        <section className = "w-full bg-white px-4 py-2 sm:px-6 md:px-8">
        <h2 className = "text-md text-black font-medium sm:text-lg md:text-xl">
            Team Members
        </h2>
        </section>
      {/* TeamPage Content */}
        {/* Remove the cap on width limit*/}
        <section className = "w-full flex-1 space-y-2 bg-brand-red p-2 sm:px-6 md:px-8">
        {teamMembers.map((member, index) => (
            <article
                key={member.name}
                // clamp(min, preferred, max): scales continuously with
                // viewport width instead of jumping at sm:/md:/lg: —
                // column and min-h share the same growth rate so the card
                // stays proportional at every width, not just at breakpoints
                className="grid min-h-[clamp(8rem,6rem+8vw,14rem)] grid-cols-[clamp(7rem,5rem+8vw,13rem)_1fr]"
            >
                <div className="flex items-center justify-center">
                    <Image
                        src={member.image}
                        alt={member.name}
                        width={128}
                        height={128}
                        priority={index === 0}
                        // w-3/4 of a now-fixed column is itself a fixed size
                        // (75px on mobile, 96px from sm: up) instead of 75%
                        // of an unbounded column — this is what was making
                        // the circle balloon on wide screens
                        className="aspect-square w-3/4 rounded-full border-2 border-white object-cover"
                    />
                </div>

                <div className="rounded-r-lg border border-zinc-200 bg-white p-[clamp(1rem,0.75rem+1vw,2rem)] shadow-sm">
                    <h3 className="font-semibold text-black text-[clamp(0.875rem,0.75rem+0.6vw,1.25rem)]">
                        {member.name}
                    </h3>

                    <p className="text-[clamp(0.75rem,0.65rem+0.5vw,1rem)] text-zinc-600">
                        {member.role}
                    </p>

                    <div className="mt-2 text-[clamp(0.75rem,0.65rem+0.5vw,1rem)] text-zinc-700">
                        {member.description}
                    </div>
                </div>
            </article>

        ))}
        </section>
    </div>
    )
}


                        
