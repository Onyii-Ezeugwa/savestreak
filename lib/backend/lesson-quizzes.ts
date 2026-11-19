export const QUIZ_VERSION = "1";
export const PASS_PERCENT = 70;

export interface LessonQuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonQuiz {
  id: string;
  lessonId: string;
  topics: string[];
  passPercent: number;
  questions: LessonQuizQuestion[];
}

function quiz(
  lessonId: string,
  topics: string[],
  questions: Array<Omit<LessonQuizQuestion, "id">>,
): LessonQuiz {
  return {
    id: lessonId,
    lessonId,
    topics,
    passPercent: PASS_PERCENT,
    questions: questions.map((question, index) => ({
      ...question,
      id: `${lessonId}-${index + 1}`,
    })),
  };
}

export const LESSON_QUIZZES: LessonQuiz[] = [
  quiz("where-money-goes", ["beginner"], [
    {
      prompt: "What does a checking balance tell you on its own?",
      choices: [
        "Which category took the most money",
        "What is left, not where the money went",
        "How much you should save next week",
        "Which purchase to return",
      ],
      correctIndex: 1,
      explanation: "A balance is what remains. Categories show what happened to the rest.",
    },
    {
      prompt: "How often does the lesson suggest looking at category totals?",
      choices: ["Every purchase", "Once a week", "Once a year", "Only when the account is empty"],
      correctIndex: 1,
      explanation: "A weekly look at categories is more useful than checking every single purchase.",
    },
    {
      prompt: "What should you circle first?",
      choices: [
        "The smallest category",
        "The biggest category",
        "Every cash purchase",
        "The oldest transaction",
      ],
      correctIndex: 1,
      explanation: "The biggest category is where a small change shows up first.",
    },
    {
      prompt: "What is enough to start, even without a perfect budget?",
      choices: [
        "Name the category, notice the amount, and pick one change",
        "Track every receipt for a year first",
        "Move all spending into one category",
        "Wait until next semester",
      ],
      correctIndex: 0,
      explanation: "You can start by naming the category and choosing one thing to do differently.",
    },
  ]),
  quiz("food-week", ["food"], [
    {
      prompt: "Where does food spending usually grow?",
      choices: [
        "One large dinner",
        "Small orders, fees, and snacks",
        "Only grocery stores",
        "A single monthly bill",
      ],
      correctIndex: 1,
      explanation: "Delivery fees and late snacks add up faster than one planned meal.",
    },
    {
      prompt: "When should you pick the week's food amount?",
      choices: ["After you have spent it", "Before Monday", "Only on payday", "When a friend asks"],
      correctIndex: 1,
      explanation: "Deciding the amount before the week starts gives the rest of the week a number to follow.",
    },
    {
      prompt: "What does the lesson suggest when you are close to that amount?",
      choices: [
        "Order delivery so you do not have to cook",
        "Use food you already have or a cheaper campus option",
        "Ignore the number until Sunday",
        "Move the goal date instead",
      ],
      correctIndex: 1,
      explanation: "Switching to food you already have keeps the week inside the amount you chose.",
    },
    {
      prompt: "What should you do with money you did not spend on a skipped delivery?",
      choices: [
        "Leave it in the cart for later",
        "Move it toward your savings goal the same day",
        "Spend it on a larger order tomorrow",
        "Wait and see if another fee appears",
      ],
      correctIndex: 1,
      explanation: "Moving the unspent amount the same day is what turns the swap into savings.",
    },
  ]),
  quiz("getting-around", ["transport"], [
    {
      prompt: "When are transport costs easiest to miss?",
      choices: [
        "When the trip was planned last week",
        "In a hurry, such as a late ride to class",
        "When you walk",
        "When the bus is free",
      ],
      correctIndex: 1,
      explanation: "Urgent rides and unplanned gas are the trips that add up.",
    },
    {
      prompt: "What should you do with trips you already know about?",
      choices: [
        "Pay for a ride each time so you are not late",
        "Mark them and use a bus, a shared ride, or a walk",
        "Skip class if the trip costs money",
        "Guess the cost at the end of the month",
      ],
      correctIndex: 1,
      explanation: "Known trips can use a cheaper option. Paid rides stay for the ones that need them.",
    },
    {
      prompt: "What is a ride limit?",
      choices: [
        "A weekly cap, after which the next trip uses a cheaper option",
        "The most expensive ride you can find",
        "A rule that bans every bus trip",
        "A fee the bank charges for transport",
      ],
      correctIndex: 0,
      explanation: "After you hit the limit, the next trip should be the cheaper option.",
    },
    {
      prompt: "When is a ride limit most useful?",
      choices: [
        "When transport is a top category",
        "When you have no trips that week",
        "Only during summer",
        "When food is the only category you track",
      ],
      correctIndex: 0,
      explanation: "The lesson suggests a ride limit when transport is leading your spending.",
    },
  ]),
  quiz("school-costs", ["school"], [
    {
      prompt: "Why do school costs feel sudden?",
      choices: [
        "They were not written down before the due date",
        "They are always the same as rent",
        "Banks hide them from statements",
        "They only happen once in a degree",
      ],
      correctIndex: 0,
      explanation: "Books, fees, and software feel sudden when they were not on the list yet.",
    },
    {
      prompt: "What should you write down at the start of a term?",
      choices: [
        "Only the costs you have already paid",
        "The school purchases you can already see, even as a rough total",
        "Nothing until the charge posts",
        "Every classmate's book list",
      ],
      correctIndex: 1,
      explanation: "A rough total tells you what has to come out of spending money.",
    },
    {
      prompt: "When a school charge shows up, what should you check next?",
      choices: [
        "Whether another school cost is still coming",
        "Whether you can ignore the rest of the term",
        "Whether the category should be food",
        "Whether the receipt can be deleted",
      ],
      correctIndex: 0,
      explanation: "One posted charge is a reminder to look for the next one before it is due.",
    },
    {
      prompt: "What is easier than covering every school cost on the due date?",
      choices: [
        "Saving a little before the due date",
        "Paying them all with one unplanned purchase",
        "Waiting until the account is overdrawn",
        "Skipping the list until finals",
      ],
      correctIndex: 0,
      explanation: "Setting money aside before the due date is easier than covering the whole list at once.",
    },
  ]),
  quiz("fun-on-a-budget", ["entertainment"], [
    {
      prompt: "What crowds a savings goal out, according to the lesson?",
      choices: [
        "Fun that was named and planned",
        "Entertainment spending that was never named",
        "A weekly look at categories",
        "A transfer made at the start of the week",
      ],
      correctIndex: 1,
      explanation: "Fun belongs in the plan. Unnamed entertainment is what crowds the goal out.",
    },
    {
      prompt: "What should you set money aside for first?",
      choices: [
        "Every event you might attend",
        "The one event you care about this month",
        "A new subscription each week",
        "Whatever is left after the month ends",
      ],
      correctIndex: 1,
      explanation: "Cover the one event you care about first. Smaller extras can wait.",
    },
    {
      prompt: "What is the 24-hour pause for?",
      choices: [
        "To see if you still want the ticket or subscription tomorrow",
        "To hide the purchase from your categories",
        "To raise the price",
        "To skip the savings goal",
      ],
      correctIndex: 0,
      explanation: "If you still want it tomorrow, it was a choice. If not, the money can go to the goal.",
    },
    {
      prompt: "When should you use that pause?",
      choices: [
        "When entertainment is your top category",
        "Only when the event is free",
        "After you have already bought the ticket",
        "When you have no goals",
      ],
      correctIndex: 0,
      explanation: "The pause is for the next subscription or ticket when entertainment is leading.",
    },
  ]),
  quiz("pause-before-buying", ["shopping"], [
    {
      prompt: "Why are small shopping purchases easy to overlook?",
      choices: [
        "They feel harmless in the moment",
        "They never show up on a statement",
        "They are always returned",
        "They do not use the same money as a goal",
      ],
      correctIndex: 0,
      explanation: "A small checkout still uses the same money as the savings transfer.",
    },
    {
      prompt: "What should you name before you pay?",
      choices: [
        "The goal you are working on",
        "The store's return window only",
        "A new category called other",
        "Last month's biggest bill",
      ],
      correctIndex: 0,
      explanation: "Naming the goal makes the purchase a choice against this week's transfer.",
    },
    {
      prompt: "What does the pause allow you to do?",
      choices: [
        "Buy it, as long as it was a decision",
        "Block every purchase",
        "Hide the charge from your transactions",
        "Skip saving for the rest of the month",
      ],
      correctIndex: 0,
      explanation: "You can still buy it. The pause is what makes it a choice.",
    },
    {
      prompt: "If shopping leads your categories, what should you delay this week?",
      choices: [
        "One type of purchase, such as clothes or gadgets",
        "Every grocery trip",
        "The savings transfer",
        "Reading the lesson",
      ],
      correctIndex: 0,
      explanation: "Delay one type of purchase, and keep the receipt habit so the next pause has real numbers.",
    },
  ]),
  quiz("pay-goal-first", ["goals", "beginner"], [
    {
      prompt: "What usually happens to money left until the end of the week?",
      choices: [
        "It is gone",
        "It automatically moves to the goal",
        "It earns a higher balance by waiting",
        "It is easier to track than an early transfer",
      ],
      correctIndex: 0,
      explanation: "Money left at the end of the week is usually spent. Money moved at the start is what reaches the goal.",
    },
    {
      prompt: "When income lands, what should happen first?",
      choices: [
        "Transfer the amount the goal needs, then spend from what remains",
        "Spend first and transfer whatever is left",
        "Wait until the goal date",
        "Skip the transfer if the week looks busy",
      ],
      correctIndex: 0,
      explanation: "The transfer comes before everyday spending, even if it is smaller than the full target.",
    },
    {
      prompt: "What if you cannot move the full amount?",
      choices: [
        "Move nothing until you can cover the whole target",
        "Move something so the habit stays in place",
        "Delete the goal",
        "Change the category of last week's spending",
      ],
      correctIndex: 1,
      explanation: "A smaller transfer still keeps the weekly habit going.",
    },
    {
      prompt: "When should you check the goal?",
      choices: [
        "On the same day each week",
        "Only after you miss the target date",
        "Once a semester",
        "Whenever a purchase fails",
      ],
      correctIndex: 0,
      explanation: "Checking the goal on the same day each week is what keeps the transfer from slipping.",
    },
  ]),
];

export function quizForLesson(lesson: { id: string; topics: string[] }) {
  const direct = LESSON_QUIZZES.find((item) => item.lessonId === lesson.id);
  if (direct) {
    return direct;
  }
  for (const topic of lesson.topics) {
    const match = LESSON_QUIZZES.find((item) => item.topics.includes(topic));
    if (match) {
      return match;
    }
  }
  return LESSON_QUIZZES[0]!;
}

export function scoreQuiz(correct: number[], chosen: number[], passPercent = PASS_PERCENT) {
  const total = correct.length;
  const score = correct.reduce(
    (sum, answer, index) => sum + (chosen[index] === answer ? 1 : 0),
    0,
  );
  const percent = total === 0 ? 0 : Math.round((score / total) * 100);
  return { score, total, percent, passed: percent >= passPercent };
}
