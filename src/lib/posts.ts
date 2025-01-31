import path from "path";
import fs from "fs/promises";
import { z } from "zod";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "content");

const PostSchema = z.object({
  title: z.string().min(45).max(65),
  description: z.string(),
  publishedAt: z.coerce.string(),
  published: z.boolean().optional().default(false),
});

// Ajout de `content` au type `Post`
export type Post = z.infer<typeof PostSchema> & {
  slug: string;
  content: string;
};

export const getPosts = async () => {
  const files = await fs.readdir(postsDirectory);
  const fileNames = files.filter((f) => f.endsWith(".mdx"));

  const posts = await Promise.all(
    fileNames.map(async (fileName) => {
      const fullPath = path.join(postsDirectory, fileName);
      try {
        const fileContent = await fs.readFile(fullPath, "utf-8");
        const frontmatter = matter(fileContent);

        const safeData = PostSchema.safeParse(frontmatter.data);

        if (!safeData.success) {
          console.error(
            `Error parsing file: ${fileName} - ${safeData.error.issues
              .map((i) => i.message)
              .join(", ")}`
          );
          return null; // Retourner null si parsing échoue
        }

        if (
          !safeData.data.published &&
          process.env.NODE_ENV !== "development"
        ) {
          return null; // Ignorer les posts non publiés en production
        }

        return {
          ...safeData.data,
          slug: fileName.replace(/^\d+-/, "").replace(".mdx", ""),
          content: frontmatter.content, // Ajout du contenu ici
        };
      } catch (error) {
        console.error(`Error reading file: ${fileName} - ${error}`);
        return null; // Retourner null en cas d'erreur
      }
    })
  );

  // Filtrer les résultats nulls
  return posts.filter((post) => post !== null);
};

export const getPost = async (slug: string) => {
  const posts = await getPosts();
  return posts.find((post) => post.slug === slug);
};
