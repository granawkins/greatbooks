"use client";

import CourseChoiceModal from "@/components/CourseChoiceModal";

export default function BookOrCourseChoice({
  bookId,
  bookTitle,
  bookChapter,
  courseId,
  courseTitle,
  courseChapter,
}: {
  bookId: string;
  bookTitle: string;
  bookChapter: number;
  courseId: string;
  courseTitle: string;
  courseChapter: number;
}) {
  return (
    <CourseChoiceModal
      title={bookTitle}
      message="You're reading this book as part of a course. How would you like to continue?"
      choices={[
        {
          label: `Continue in ${courseTitle}`,
          sublabel: `Chapter ${courseChapter}`,
          badge: "Course",
          href: `/${courseId}/${courseChapter}`,
        },
        {
          label: "Read independently",
          sublabel: `${bookTitle} — Chapter ${bookChapter}`,
          href: `/${bookId}/${bookChapter}`,
        },
      ]}
    />
  );
}
