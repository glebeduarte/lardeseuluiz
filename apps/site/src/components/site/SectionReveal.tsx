import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  id?: string;
}

const SectionReveal = ({ children, className = "", id }: Props) => (
  <motion.section
    id={id}
    className={`site-section ${className}`}
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.6 }}
  >
    {children}
  </motion.section>
);

export default SectionReveal;
