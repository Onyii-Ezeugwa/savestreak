export interface LessonDefinition {
  id: string;
  title: string;
  body: string;
  takeaway: string;
  topics: string[];
  minutes: number;
}

export const LESSONS: LessonDefinition[] = [
  {
    id: "where-money-goes",
    title: "See where your money goes",
    minutes: 5,
    topics: ["beginner"],
    takeaway: "A weekly look at your categories tells you more than a single balance.",
    body: [
      "A checking balance only says what is left. Categories show what happened to the rest. Food, transport, school, and shopping each pull from the same paycheck, and one of them is usually larger than you expected.",
      "Once a week, look at the category totals instead of every single purchase. Circle the biggest one. That is the place a small change will show up first.",
      "You do not need a perfect budget to start. Name the category, notice the amount, and decide one thing you will do differently next week.",
    ].join("\n\n"),
  },
  {
    id: "food-week",
    title: "Keep campus food in bounds",
    minutes: 5,
    topics: ["food"],
    takeaway: "Decide your food money before the week starts, then let the rest of the week follow that number.",
    body: [
      "Food spending grows from small orders, not one big dinner. A few delivery fees and late-night snacks can pass what you meant to spend on groceries.",
      "Pick a food amount for the week before Monday. When you are close to it, switch to food you already have or a cheaper campus option.",
      "If food is your top category, try one swap this week: cook once, split an order, or skip one delivery day. Move what you did not spend toward your savings goal the same day.",
    ].join("\n\n"),
  },
  {
    id: "getting-around",
    title: "Plan the trips that add up",
    minutes: 5,
    topics: ["transport"],
    takeaway: "Rides and gas are easier to manage when the trip is chosen before you are in a hurry.",
    body: [
      "Transport costs hide in urgent moments: a late ride to class, a solo trip you could have shared, or a tank of gas you did not expect.",
      "Look at the week ahead and mark the trips you already know about. Those can be bus, a shared ride, or a walk. Leave paid rides for the trips that truly need them.",
      "When transport is a top category, set a ride limit for the week. After you hit it, the next trip uses a cheaper option.",
    ].join("\n\n"),
  },
  {
    id: "school-costs",
    title: "Catch school costs early",
    minutes: 5,
    topics: ["school"],
    takeaway: "Course costs hurt less when you see them before the due date.",
    body: [
      "Books, lab fees, printing, and software often land in the same month as rent and food. They feel sudden only because they were not on the list yet.",
      "At the start of a term, write down the school purchases you can already see. Even a rough total tells you what has to come out of spending money.",
      "When a school charge shows up in your transactions, check whether another one is coming. Saving a little before the due date is easier than covering all of it at once.",
    ].join("\n\n"),
  },
  {
    id: "fun-on-a-budget",
    title: "Leave room for fun",
    minutes: 5,
    topics: ["entertainment"],
    takeaway: "Fun belongs in the plan. An unnamed entertainment spend is what crowds out a goal.",
    body: [
      "Concerts, games, and nights out are part of student life. The trouble starts when they are all unplanned and they land in the same week as a savings transfer.",
      "Choose the one event you care about this month and set money aside for it first. Smaller extras can wait until that one is covered.",
      "If entertainment is your top category, pause the next subscription or ticket for 24 hours. If you still want it tomorrow, it was a choice. If not, the money can go to your goal.",
    ].join("\n\n"),
  },
  {
    id: "pause-before-buying",
    title: "Pause before you buy",
    minutes: 5,
    topics: ["shopping"],
    takeaway: "A short pause turns a scroll into a decision.",
    body: [
      "Shopping adds up in carts and checkout screens, especially when the item is small enough to feel harmless. Those purchases rarely feel connected to a savings goal in the moment.",
      "Before you pay, name the goal you are working on and ask whether this purchase matters more than this week's transfer. You can still buy it. The pause is what makes it a choice.",
      "If shopping leads your categories, pick one type of purchase to delay this week, such as clothes or gadgets. Keep the receipt habit so the next pause has real numbers behind it.",
    ].join("\n\n"),
  },
  {
    id: "pay-goal-first",
    title: "Move savings before you spend",
    minutes: 5,
    topics: ["goals", "beginner"],
    takeaway: "A goal grows when the transfer happens before everyday spending starts.",
    body: [
      "Money left at the end of the week is usually gone. Money moved at the start of the week is what reaches a goal.",
      "When income lands, transfer the amount your goal needs first, even if it is smaller than the full target. Then spend from what remains.",
      "Check the goal on the same day each week. If you cannot move the full amount, move something. A smaller transfer still keeps the habit in place.",
    ].join("\n\n"),
  },
];
