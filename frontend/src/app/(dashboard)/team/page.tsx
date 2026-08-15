import Image from 'next/image'

// Array of team members, quite a static method to store team members information, it work tho I am not sure it's the best
const teamMembers = [
    {
    name: 'Narwes',
    role: 'Project Manager',
    description:
        'Short description about the team member and their role within the project.',
    image: '/images/team/Narwes.png',
    },
    {
        name: 'Scarlet Heng',
        role: 'Business Analyst',
        description: (
        <>
            <p>
                I&apos;m sorry, but I don&apos;t want to be an emperor. That&apos;s not my business. I don&apos;t want to rule or conquer anyone.
            </p>
            <p>
                I should like to help everyone if possible. Jew, Gentile, Black Man, White. We all want to help one another. Human beings are like that. We want to live by each other&apos;s happiness, not by each other&apos;s misery.
            </p>
            <p>
                We don&apos;t want to hate and despise one another. In this world there is room for everyone. And the good earth is rich and can provide for everyone.
            </p>
            <p>
                The way of life can be free and beautiful, but we have lost the way. Greed has poisoned men&apos;s souls, has barricaded the world with hate, has goose-stepped us into misery and bloodshed.
            </p>
            <p>
                We have developed speed, but we have shut ourselves in. Machinery that gives abundance has left us in want. Our knowledge has made us cynical. Our cleverness, hard and unkind. We think too much and feel too little.
            </p>
            <p>
                More than machinery we need humanity. More than cleverness we need kindness and gentleness. Without these qualities, life will be violent and all will be lost.
            </p>
            <p>
                The aeroplane and the radio have brought us closer together. The very nature of these inventions cries out for the goodness in men, cries out for universal brotherhood, for the unity of us all.
            </p>
            <p>
                Even now my voice is reaching millions throughout the world, millions of despairing men, women, and little children, victims of a system that makes men torture and imprison innocent people.
            </p>
            <p>
                To those who can hear me, I say, do not despair. The misery that is now upon us is but the passing of greed, the bitterness of men who fear the way of humanity. The hate of men will pass, and dictators die, and the power they took from the people will return to the people.
            </p>
            <p>
                And so long as men die, liberty will never perish.
            </p>
            <p>
                Soldiers! Don&apos;t give yourselves to brutes, men who despise you, enslave you, who regiment your lives, tell you what to do, what to think and what to feel! Who drill you, diet you, treat you like cattle, use you as cannon fodder. Don&apos;t give yourselves to these unnatural men - machine men with machine minds and machine hearts!
            </p>
            <p>
                You are not machines! You are not cattle! You are men! You have the love of humanity in your hearts! You don&apos;t hate! Only the unloved hate - the unloved and the unnatural!
            </p>
            <p>
                Soldiers! Don&apos;t fight for slavery! Fight for liberty! In the 17th Chapter of St Luke it is written: &quot;the Kingdom of God is within man&quot; - not one man nor a group of men, but in all men! In you!
            </p>
            <p>
                You, the people, have the power, the power to create machines, the power to create happiness! You, the people, have the power to make this life free and beautiful, to make this life a wonderful adventure.
            </p>
            <p>
                Then in the name of democracy, let us use that power - let us all unite. Let us fight for a new world, a decent world that will give men a chance to work, that will give youth a future, and old age a security. By the promise of these things, brutes have risen to power. But they lie! They do not fulfill that promise. They never will!
            </p>
            <p>
                Dictators free themselves but they enslave the people! Now let us fight to fulfill that promise! Let us fight to free the world, to do away with national barriers, to do away with greed, with hate and intolerance. Let us fight for a world of reason, a world where science and progress will lead to all men&apos;s happiness. Soldiers, in the name of democracy, let us all unite!
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
                I have nothing but my sorrow and I want nothing more. It has been, it still is, faithful to me.
            </p>
            <p>
                Why should I begrudge it, since during the hours when my soul crushed the depths of my heart, it was seated there beside me?
            </p>
            <p>
                O sorrow, I have ended, you see, by respecting you, because I am certain you will never leave me.
            </p>
            <p>
                Ah! I realize it: your beauty lies in the force of your being. You are like those who never left the sad fireside corner of my poor black heart.
            </p>
            <p>
                O my sorrow, you are better than a well-beloved: because I know that on the day of my final agony, you will be there, lying in my sheets, O sorrow, so that you might once again attempt to enter my heart.
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
    <div className = "flex flex-col bg-zinc-50">
        {/*Project Header*/}
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
        <section className = "space-y-2 bg-brand-red p-2 sm:px-6 md:px-8">
        {teamMembers.map((member, index) => (
            <article
                key={member.name}
                className="grid min-h-32 grid-cols-[20%_80%]"
            >
                <div className="flex items-center justify-center">
                    <Image
                        src={member.image}
                        alt={member.name}
                        width={128}
                        height={128}
                        priority={index === 0}
                        className="aspect-square w-3/4 rounded-full border-2 border-white object-cover"
                    />
                </div>

                <div className="rounded-r-lg border border-zinc-200 bg-white p-6 shadow-sm">
                    <h3 className="font-semibold text-black">
                        {member.name}
                    </h3>

                    <p className="text-sm text-zinc-600">
                        {member.role}
                    </p>

                    <div className="mt-2 text-xs text-zinc-700">
                        {member.description}
                    </div>
                </div>
            </article>

        ))}
        </section>
    </div>
    )
}

                        
