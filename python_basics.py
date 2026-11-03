print("Hello World!") 
output:Hello World

# VARIABLES
a = 10
print(a) 
print("a")
output: 10
output: a

a = 20
print(a)
output:20

a=10
b=20
print(a,b)
output: 10 20
print("a", b)
output: a, 20

name = "hari"
print(name)
output: hari
print("name")
output: name

a, b = 10, 20
print(a, b)
output: 10 20
a, b = b, a
print(a, b)
output: 20 10

ravi, hari, krish=10,34,23
print(krish)
output: 10
print("krish")
output: krish

# DATA TYPES

x = 5 --- INT
y = 5.4 --- FLOAT
z = 2+3j ---Complex

print(x) --o/p: 5
print(y) --o/p: 5.4
print(z) --o/p: 2+3j
name = "hari"
print(name) -- o/p: hari

# TYPE FUNCTION

x= 10
y= 3.2
z= 1+2j
print(type(x)) -- <class 'int'>
print(type(y)) -- <class 'float'>
print(type(z)) -- <class 'complex'>
name = "hari"
print(type(name)) -- <class 'str'>

# TYPE CASTING

a= 24
b= 2.4
c= 2+2j
print(int(b)) -- 2
print(float(a)) -- 2.4
print(complex(a)) -- (24+0j)
print(float(10)) -- 10.0
print(int("23")) -- 23
print(complex(3)) -- (3+0j)

x = 8
y = 5.4
a = float(x) 
b = int(y)
c = complex(x) 
print(a) -- 8.0
print(b) -- 5
print(c) -- (8+0j)

# BOOLEAN (bool)
a = True
b = False
print(a) -- True
print(type(a)) -- <class 'bool'>
print(b) -- False
print(type(b)) -- <class 'bool'>

a = 0
b = 1
print(a) -- 0
print(bool(a)) -- False
print(b)
print(bool(b)) -- True

# LIST

fruits = ["apple", "banana", "cherry"]
print(fruits) -- ['apple', 'banana', 'cherry']

fruits[0] = "mango"
print(fruits) -- ['mango', 'banana', 'cherry']

fruits[1] = "grapes"
print(fruits) -- ['mango', 'grapes', 'cherry']

fruits[2] = "strawberry"
print(fruits) -- ['mango', 'grapes', 'strawberry']

# numeric values
a= [1, 3, 5, 7, 9]
print(a) -- [1, 3, 5, 7, 9]
a[1] = 2
print(a) -- [1, 2, 5, 7, 9]
a[2] = 3
print(a) -- [1, 2, 3, 7, 9]
a[3]= 4
print(a) -- [1, 2, 3, 4, 9]
a[4]= 5
print(a) -- [1, 2, 3, 4, 5]

# TUPLE

t1 = (1,)
print(t1)
print(type(t1))

# SET

numbers = {10, 20, 30, 20, 10}
print(numbers) --- {10, 20, 30}
numbers.add(40)
print(numbers) --- {40, 10, 20, 30}

s1 = {"a", "a", "b", "c", "b"}
print(s1) -- {'c', 'b', 'a'}
s1.add("d")
print(s1) -- {'d', 'a', 'b', 'c'}

# STRING

name = "suji"
print(name)

x = "hello! how r u"
x = "y" + x[1:]
print(x)

hello=5
HELLO=56
print(HELLO)
print(hello)

# INPUT AND OUTPUT

name = input("Enter your name: ")
print("Hello Welcome to World of", name) 
output: 
Enter your name: Python
Hello Welcome to World of Python

name= input("enter your name: ")
print("hello",name,"what are you doing?", "are you fine?")
output: 
enter your name: suji
hello suji what are you doing? are you fine?
print("yeah I m okay", "what about you?")
output: yeah I m okay what about you?

# OPERATORS
1> arthimetic operators
x = 10
y = 5
print(x + y) -- 15
print(x - y) -- 5
print(x * y) -- 50
print(x / y) -- 2.0
print(x // y) -- 2
print(x % y) -- 0
print(x ** y) -- 100000

print("Addition:",x + y) -- Addition: 15
print("Subtraction:",x - y) -- Subtraction: 5
print("Multiplication:",x * y) -- Multiplication: 50
print("Division:",x / y) -- Division: 2.0
print("Floor Division:",x // y) -- Floor Division: 2
print("Modulus:",x % y) -- Modulus: 0
print("Exponent:",x ** y) -- Exponent: 100000

2> Assignment Operators

x = 10
x += 20
print(x)
output: 30
x = 10
x -= 20
print(x)
output: -10
x = 10
x *= 20
print(x)
output: 200
x = 10
x /= 20
print(x)
output: 0.5
x = 10
x //= 20
print(x)
output: 0
x = 10
x %= 20
print(x)
output: 10
x = 10
x **= 20
print(x)
output: 100000000000000000000

# Comparison Operators
a= 2
b= 3
print(a > b) -- False
print(a < b) -- True
print(a == b) -- False
print(a != b) -- True
print(a >= b) -- False
print(a <= b) -- True

print(5 > 3) -- True
print(5 < 3) -- False
print(5 == 3) -- False
print(5 != 3) -- True
print(5 >= 3) -- True
print(5 <= 3) -- False

# Logical Operators
a = 10
b = 20
print(a > 5 and b > 10) -- True
print(a > 15 and b > 10) -- False
print(a > 5 and b > 30) -- False
print(a > 15 and b > 30) -- False

a = 10
b = 20
print(a > 5 or b > 10) -- True
print(a > 15 or b > 10) -- True
print(a > 5 or b > 30) -- True
print(a > 15 or b > 30) -- True

a = 10
print(not(a > 5)) -- False
print(not(a > 15)) -- True
