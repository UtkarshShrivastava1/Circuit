import React from "react";
import Link from "next/link";

function Hero() {
  const cardData = [
    {
      title: "Project Management",
      description: "Efficiently plan, execute, and monitor your projects.",
      icon: "icon1",
      url: "/dashboard",
    },
    {
      title: "Task Tracking",
      description: "Stay on top of your tasks and meet your deadlines.",
      icon: "icon2",
      url: "/dashboard",
    },
    {
      title: "Team Collaboration",
      description: "Seamlessly collaborate with your team members.",
      icon: "icon3",
      url: "/dashboard",
    },
    {
      title: "Time Management",
      description: "Optimize your time and boost productivity.",
      icon: "icon4",
      url: "/dashboard",
    },
    {
      title: "Resource Allocation",
      description: "Manage resources effectively across projects.",
      icon: "icon5",
      url: "/dashboard",
    },
    {
      title: "Reporting & Analytics",
      description: "Gain insights with powerful reporting tools.",
      icon: "icon6",
      url: "/dashboard",
    },
  ];

  return (
    <section>
      <div className="max-w-screen-xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-2 lg:items-center lg:gap-x-16">
          <div className="mx-auto max-w-lg text-center lg:mx-0 ltr:lg:text-left rtl:lg:text-right">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Simplify Your Project Management
            </h2>

            <p className="mt-4 text-yellow-400">
              Take control of your projects with our comprehensive management
              system. From task tracking to resource allocation, we provide all
              the tools you need to succeed.
            </p>

            <Link
              href="/dashboard"
              className="mt-8 inline-block rounded bg-indigo-600 px-12 py-3 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-yellow-400"
            >
              Get Started Today
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {cardData.map((card, index) => (
              <Link
                key={index}
                className="block rounded-xl border bg-white dark:bg-slate-950  border-gray-100 p-4 shadow-sm hover:border-gray-200 hover:ring-1 hover:ring-yellow-200 focus:outline-none focus:ring"
                href={card.url}
              > 
                <span className="inline-block rounded-lg bg-gray-200 dark:bg-slate-700  p-3">
                  <svg
                    className="size-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Replace this path with the appropriate icon for each card */}
                    <path d="M12 14l9-5-9-5-9 5 9 5z"></path>
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
                    ></path>
                  </svg>
                </span>

                <h2 className="mt-2 font-bold">{card.title}</h2>

                <p className="hidden sm:mt-1 sm:block sm:text-sm sm:text-yellow-400">
                  {card.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
